# BidFlow — Architecture & System Design Document

## 1. System Overview & Executive Summary

**BidFlow** is a production-grade, concurrency-resilient real-time auction marketplace. While specifically tailored for a university ecosystem (textbooks, laptops, lab hardware, electronics), the domain model and architectural principles are designed for general-purpose high-concurrency auction environments.

### Core Architectural Differentiators
1. **Pessimistic Row-Level Lock Serializability**: Utilizes PostgreSQL `SELECT ... FOR UPDATE` row locks to serialize concurrent bid submissions per auction. Eliminates lost-update phenomena, phantom bids, and negative margin race conditions.
2. **Post-Commit Real-Time Broadcast**: Socket.IO events are emitted strictly after the transactional database commit succeeds, eliminating dirty real-time state leaks.
3. **Transactional Anti-Sniping (Soft-Close)**: Automatically extends the auction deadline by a configurable interval ($T_{\text{extend}} = 120s$) if an accepted bid occurs within the final window ($T_{\text{threshold}} = 30s$), calculated using the authoritative server clock.
4. **Idempotent At-Least-Once Closure Worker**: Background job utilizing `SKIP LOCKED` row querying to guarantee that overdue auctions are processed exactly once per auction lifecycle, surviving process restarts with zero duplicate winner events.
5. **Request Idempotency Engine**: Cryptographic payload-hashed idempotency keys prevent network-retry duplicates and double-click bid spikes.

---

## 2. High-Level System Architecture

```mermaid
flowchart TD
    subgraph ClientLayer["Client Layer (SPA)"]
        Browser["React 18 + Vite + TypeScript"]
        RQ["TanStack Query (State & Cache)"]
        SIO_Client["Socket.IO Client (Real-time Events)"]
        RHF["React Hook Form + Zod"]
    end

    subgraph GatewayLayer["API Gateway & Real-Time Gateway (NestJS)"]
        HTTP_In["Express HTTP REST Server"]
        WS_Gateway["Socket.IO Gateway (Auction Rooms)"]
        AuthGuard["JWT / Argon2id Auth Guard & Roles Guard"]
        IdempInt["Idempotency Interceptor"]
        RateLimiter["Rate Limiting & Throttler"]
    end

    subgraph ServiceLayer["Modular Monolith Services"]
        AuthSvc["Auth Service"]
        ListingsSvc["Listings Service"]
        AuctionsSvc["Auctions Service"]
        BidsEngine["Bids Engine (Transactional)"]
        NotifSvc["Notifications Service"]
        AdminSvc["Admin & Moderation Service"]
        CloseWorker["Auction Closure Worker (Cron/Interval)"]
    end

    subgraph DataLayer["Persistence Layer (PostgreSQL)"]
        PG[("PostgreSQL 16")]
        PrismaORM["Prisma Client & Migrations"]
        RowLocks["Row-Level Locks (SELECT ... FOR UPDATE)"]
        AuditTable["Immutable Audit Logs & Bids"]
    end

    Browser -->|HTTPS REST| RateLimiter
    RateLimiter --> HTTP_In
    HTTP_In --> AuthGuard
    AuthGuard --> IdempInt
    IdempInt --> BidsEngine
    IdempInt --> ListingsSvc
    IdempInt --> AuctionsSvc
    IdempInt --> AuthSvc
    IdempInt --> AdminSvc

    Browser <-->|WSS Dual-Way| WS_Gateway
    WS_Gateway --> AuthGuard

    BidsEngine --> PrismaORM
    AuctionsSvc --> PrismaORM
    ListingsSvc --> PrismaORM
    CloseWorker -->|Polls overdue with SKIP LOCKED| PrismaORM
    PrismaORM --> RowLocks
    RowLocks --> PG

    BidsEngine -.->|Post-Commit Event| WS_Gateway
    CloseWorker -.->|Post-Commit Event| WS_Gateway
    NotifSvc -.->|Push Alert| WS_Gateway
```

---

## 3. End-to-End Concurrent Bidding Sequence

The sequence below illustrates two users, **Alice** and **Bob**, attempting to bid simultaneously on the same auction item with starting price \$100 and minimum increment \$5.

```mermaid
sequenceDiagram
    autonumber
    actor Alice as Buyer A (Alice)
    actor Bob as Buyer B (Bob)
    participant API as BidFlow NestJS API
    participant Lock as PG Row Lock (Auction #42)
    participant DB as PostgreSQL DB (ACID TX)
    participant WS as Socket.IO Gateway
    actor Room as Auction Room Subscribers

    Note over Alice,Bob: Current Highest Bid: $100. Both submit $110 at timestamp T0.
    par Alice submits bid
        Alice->>API: POST /api/v1/auctions/42/bids { amount: 110 } [Idempotency-Key: K_A]
    and Bob submits bid
        Bob->>API: POST /api/v1/auctions/42/bids { amount: 110 } [Idempotency-Key: K_B]
    end

    API->>DB: Alice TX: BEGIN
    API->>DB: Bob TX: BEGIN

    critical Mutual Exclusion on Auction #42
        API->>Lock: Alice TX: SELECT * FROM "auctions" WHERE id=42 FOR UPDATE
        Note over Lock: Lock GRANTED to Alice TX
        API->>Lock: Bob TX: SELECT * FROM "auctions" WHERE id=42 FOR UPDATE
        Note over Lock: Bob TX BLOCKS waiting for Alice TX to release lock
    end

    Note over DB: Alice validation: 110 >= 100 + 5 (Valid!)
    API->>DB: Alice TX: INSERT INTO "bids" (auctionId, bidderId, amount, status) VALUES (42, Alice, 110, 'ACCEPTED')
    API->>DB: Alice TX: UPDATE "auctions" SET currentHighestBid=110, currentHighestBidderId=Alice, bidCount=bidCount+1 WHERE id=42
    API->>DB: Alice TX: INSERT INTO "idempotency_records" VALUES (K_A, 201, ...)
    API->>DB: Alice TX: COMMIT

    Note over Lock: Lock RELEASED. Granted to Bob TX.
    API-->>Alice: 201 Created { bidId: 1, amount: 110, status: "ACCEPTED" }
    
    par Post-Commit Broadcast
        API->>WS: Emit 'bid:accepted' { auctionId: 42, amount: 110, bidder: Alice }
        WS->>Room: Broadcast to room "auction:42"
    end

    Note over DB: Bob validation resumes with fresh data: Current highest = 110.<br/>Bob's bid = 110 < (110 + 5). REJECTED!
    API->>DB: Bob TX: ROLLBACK
    API-->>Bob: 409 Conflict / 400 Bad Request { error: "Bid amount must be at least $115" }
```

---

## 4. Auction Lifecycle State Machine

```mermaid
stateDiagram-v2
    [*] --> DRAFT: Seller drafts listing
    DRAFT --> SCHEDULED: Listing published with future start time
    DRAFT --> ACTIVE: Listing published with immediate start (startTime <= now)
    SCHEDULED --> ACTIVE: Server clock reaches startTime
    
    state ACTIVE {
        [*] --> BiddingOpen
        BiddingOpen --> SoftClosing: Bid placed within 30s of deadline
        SoftClosing --> BiddingOpen: Deadline extended (+120s)
    }

    ACTIVE --> CLOSED_WITH_WINNER: Deadline elapsed & bidCount > 0
    ACTIVE --> CLOSED_WITHOUT_BIDS: Deadline elapsed & bidCount == 0
    
    ACTIVE --> SUSPENDED: Admin moderator freezes auction
    SCHEDULED --> SUSPENDED: Admin moderator freezes auction
    SUSPENDED --> ACTIVE: Admin clears report
    
    SCHEDULED --> CANCELLED: Seller cancels before bidding starts
    ACTIVE --> CANCELLED: Permitted cancellation (no bids placed only)
    SUSPENDED --> CANCELLED: Admin permanently revokes listing
    
    CLOSED_WITH_WINNER --> [*]
    CLOSED_WITHOUT_BIDS --> [*]
    CANCELLED --> [*]
```

---

## 5. Idempotency & Deduplication Engine

Every mutating financial request (`POST /api/v1/auctions/:id/bids`) accepts an `Idempotency-Key: <UUIDv4>` header.

```mermaid
flowchart TD
    Req["Incoming Bid Request with Idempotency-Key"] --> CheckTable{"Record exists in idempotency_records?"}
    CheckTable -->|Yes| CheckStatus{"Status in progress or completed?"}
    CheckStatus -->|Completed| ReturnCached["Return cached HTTP Status and JSON Response"]
    CheckStatus -->|In Progress| ReturnPending["Return 409 Conflict: Request in progress"]
    CheckTable -->|No| InsertPending["Insert record (status='PENDING', requestHash=SHA256(body))"]
    InsertPending --> RunTx["Execute Bid Transaction with Row Lock"]
    RunTx -->|Success| UpdateComplete["Update record status='COMPLETED', responseBody=Payload"]
    UpdateComplete --> Commit["Commit Transaction"]
    RunTx -->|Error| DeletePending["Delete or mark FAILED in idempotency table"]
```

---

## 6. Background Closure Worker Strategy

To guarantee that auctions close at their deadlines without depending on client countdown timers or volatile in-memory timers:

1. **Interval Worker**: Runs every 10 seconds.
2. **Atomic Batch Selection**:
   ```sql
   SELECT id FROM "auctions"
   WHERE status = 'ACTIVE' AND "endTime" <= NOW()
   ORDER BY "endTime" ASC
   LIMIT 20
   FOR UPDATE SKIP LOCKED;
   ```
3. **Worker Processing**:
   - Queries highest accepted bid for the auction.
   - If highest bid exists: status $\to$ `CLOSED_WITH_WINNER`, `winningBidId` set, creates winning notification for buyer and seller.
   - If no bids exist: status $\to$ `CLOSED_WITHOUT_BIDS`.
   - Commits transaction.
   - Emits `auction:closed` event over Socket.IO to room `auction:<id>`.
4. **Resilience**: `SKIP LOCKED` guarantees that across container restarts or horizontal replicas, workers never process the same auction concurrently.
