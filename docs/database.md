# BidFlow — Database Design Specification

## 1. Database Philosophy & Invariants

1. **Authoritative Source of Truth**: PostgreSQL is the single source of truth for all auction states, bids, balances, and outcomes.
2. **Fixed-Point Decimal Arithmetic**: All monetary quantities (`startingPrice`, `minIncrement`, `amount`, `reservePrice`) use `DECIMAL(12, 2)` to eliminate IEEE-754 floating-point inaccuracies.
3. **Pessimistic Concurrency**: Row-level locking (`SELECT ... FOR UPDATE`) is employed during all state transitions and bid evaluations.
4. **Denormalization Rationale**:
   - `auctions.currentHighestBid` and `auctions.currentHighestBidderId` are denormalized on the auction row to allow $O(1)$ read performance during high-throughput queries (market feed, search filtering, card rendering).
   - Invariant: The denormalized `currentHighestBid` is strictly updated within the **same** ACID transaction that records the accepted `bids` row.
5. **Immutable Audit History**: Accepted bids are append-only. Deleting a user or cancelling an auction never destroys bid history.

---

## 2. Entity-Relationship Diagram (ERD)

```mermaid
erDiagram
    User ||--o{ Listing : "creates"
    User ||--o{ Bid : "places"
    User ||--o{ Watchlist : "tracks"
    User ||--o{ Notification : "receives"
    User ||--o{ AuditLog : "triggers"
    User ||--o{ ListingReport : "files"
    User ||--o{ SellerFeedback : "rates"

    Listing ||--|| Auction : "schedules"
    Listing ||--o{ ListingImage : "contains"
    Listing ||--o{ ListingReport : "receives"

    Auction ||--o{ Bid : "records"
    Auction ||--o{ Watchlist : "includes"
    Auction ||--o| Bid : "won_by"

    User {
        string id PK "uuid"
        string email UK "citext/varchar"
        string passwordHash "argon2id"
        string fullName "varchar(100)"
        string role "BUYER | SELLER | ADMIN"
        string avatarUrl "varchar(500) nullable"
        string bio "text nullable"
        boolean isSuspended "default false"
        timestamp createdAt
        timestamp updatedAt
    }

    Listing {
        string id PK "uuid"
        string sellerId FK "User.id"
        string title "varchar(200)"
        string description "text"
        string category "TEXTBOOKS | ELECTRONICS | LAB_EQUIPMENT | OTHER"
        string condition "BRAND_NEW | LIKE_NEW | GOOD | FAIR"
        decimal startingPrice "numeric(12,2)"
        decimal minIncrement "numeric(12,2) default 1.00"
        decimal reservePrice "numeric(12,2) nullable"
        string status "DRAFT | PUBLISHED | ARCHIVED"
        timestamp createdAt
        timestamp updatedAt
    }

    ListingImage {
        string id PK "uuid"
        string listingId FK "Listing.id"
        string url "varchar(500)"
        boolean isPrimary "default false"
        int displayOrder "default 0"
        timestamp createdAt
    }

    Auction {
        string id PK "uuid"
        string listingId FK "Listing.id, UK"
        timestamp startTime
        timestamp endTime
        timestamp originalEndTime
        decimal currentHighestBid "numeric(12,2) nullable"
        string currentHighestBidderId FK "User.id nullable"
        int bidCount "default 0"
        string status "DRAFT | SCHEDULED | ACTIVE | CLOSED_WITH_WINNER | CLOSED_WITHOUT_BIDS | CANCELLED | SUSPENDED"
        int extensionCount "default 0"
        int antiSnipeTriggerSeconds "default 30"
        int antiSnipeExtendSeconds "default 120"
        timestamp closedAt "nullable"
        string winningBidId FK "Bid.id nullable"
        timestamp createdAt
        timestamp updatedAt
    }

    Bid {
        string id PK "uuid"
        string auctionId FK "Auction.id"
        string bidderId FK "User.id"
        decimal amount "numeric(12,2)"
        string status "ACCEPTED | REJECTED | RETRACTED"
        string rejectionReason "varchar(200) nullable"
        string idempotencyKey "varchar(64) nullable"
        timestamp createdAt
    }

    Watchlist {
        string id PK "uuid"
        string userId FK "User.id"
        string auctionId FK "Auction.id"
        timestamp createdAt
    }

    Notification {
        string id PK "uuid"
        string userId FK "User.id"
        string type "OUTBID | AUCTION_WON | AUCTION_CLOSED | AUCTION_EXTENDED | LISTING_MODERATED"
        string title "varchar(150)"
        string message "text"
        jsonb metadata "nullable"
        boolean isRead "default false"
        timestamp createdAt
    }

    AuditLog {
        string id PK "uuid"
        string actorId FK "User.id nullable"
        string action "varchar(100)"
        string entityType "varchar(50)"
        string entityId "varchar(64)"
        jsonb payload "nullable"
        string ipAddress "varchar(45) nullable"
        timestamp createdAt
    }

    IdempotencyRecord {
        string key PK "varchar(64)"
        string userId FK "User.id"
        string action "varchar(50)"
        string requestHash "char(64)"
        string status "PENDING | COMPLETED | FAILED"
        int responseStatus "nullable"
        jsonb responseBody "nullable"
        timestamp createdAt
        timestamp expiresAt
    }

    ListingReport {
        string id PK "uuid"
        string reporterId FK "User.id"
        string listingId FK "Listing.id"
        string reason "SPAM | INAPPROPRIATE | MISLEADING | OTHER"
        string details "text nullable"
        string status "PENDING | RESOLVED | DISMISSED"
        string reviewedById FK "User.id nullable"
        timestamp reviewedAt "nullable"
        string resolutionNotes "text nullable"
        timestamp createdAt
    }

    SellerFeedback {
        string id PK "uuid"
        string auctionId FK "Auction.id, UK"
        string reviewerId FK "User.id"
        string sellerId FK "User.id"
        int rating "1 to 5"
        string comment "text nullable"
        timestamp createdAt
    }
```

---

## 3. Indexes & Performance Optimization Strategy

| Table | Index Columns | Index Type | Purpose |
| :--- | :--- | :--- | :--- |
| `auctions` | `(status, endTime)` | B-Tree | High-speed polling for active/overdue auctions by background worker |
| `auctions` | `(listingId)` | B-Tree (Unique) | 1-to-1 lookup between listing and auction |
| `bids` | `(auctionId, amount DESC)` | B-Tree | Rapid evaluation of highest bid and leaderboards |
| `bids` | `(auctionId, createdAt DESC)` | B-Tree | Paginated chronological bid history |
| `bids` | `(bidderId, createdAt DESC)` | B-Tree | User bid history dashboard |
| `watchlists` | `(userId, auctionId)` | B-Tree (Unique) | Deduplicate user watchlist entries |
| `notifications` | `(userId, isRead, createdAt DESC)` | B-Tree | Filter unread notifications rapidly |
| `idempotency_records`| `(expiresAt)` | B-Tree | Periodic cleanup of stale idempotency keys |
| `listings` | `(category, status)` | B-Tree | Marketplace browsing and category filter |
| `listings` | `to_tsvector('english', title \|\| ' ' \|\| description)` | GIN | Full-text keyword search across marketplace |
