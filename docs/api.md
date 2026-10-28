# BidFlow — API & WebSocket Event Specification

## 1. REST Conventions & Standards

- **Base URL**: `/api/v1`
- **Authentication**: Bearer JWT token in `Authorization: Bearer <token>` header
- **Idempotency**: `Idempotency-Key: <UUID>` header for state-mutating requests (`POST /auctions/:id/bids`)
- **Format**: JSON `application/json`
- **Error Response Standard**:
  ```json
  {
    "statusCode": 400,
    "error": "Bad Request",
    "message": "Bid amount must be at least $115.00",
    "timestamp": "2026-10-10T14:30:00.000Z",
    "path": "/api/v1/auctions/42/bids"
  }
  ```

---

## 2. API Endpoints

### 2.1 Authentication & Profile (`/api/v1/auth`)

| Method | Endpoint | Auth | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/auth/register` | Public | Register new user account (buyer/seller/admin) |
| `POST` | `/auth/login` | Public | Authenticate user via email/password, returns JWT |
| `POST` | `/auth/logout` | User | Invalidate session / client token discard |
| `GET` | `/auth/me` | User | Retrieve current authenticated user profile & roles |

### 2.2 Listings (`/api/v1/listings`)

| Method | Endpoint | Auth | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/listings` | Public | Browse listings (filters: category, search, min/max price, status) |
| `POST` | `/listings` | Seller/Admin | Create new listing with initial metadata & images |
| `GET` | `/listings/:id` | Public | Retrieve full listing details including images & seller info |
| `PATCH` | `/listings/:id` | Seller/Admin | Update listing details (only permitted if auction not started) |
| `DELETE` | `/listings/:id` | Seller/Admin | Delete listing (only if no accepted bids exist) |

### 2.3 Auctions (`/api/v1/auctions`)

| Method | Endpoint | Auth | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/auctions` | Public | List auctions (filter: `ACTIVE`, `SCHEDULED`, `CLOSED`, sort: `endingSoon`, `highestBid`) |
| `POST` | `/auctions` | Seller/Admin | Schedule an auction for a created listing |
| `GET` | `/auctions/:id` | Public | Retrieve single auction details, current highest bid, time left |
| `GET` | `/auctions/:id/bids` | Public | Paginated history of accepted bids for an auction |
| `POST` | `/auctions/:id/bids` | Buyer/Admin | Submit bid with concurrency control & Idempotency-Key |
| `POST` | `/auctions/:id/watchlist` | Buyer | Add auction to user's personal watchlist |
| `DELETE`| `/auctions/:id/watchlist` | Buyer | Remove auction from user's watchlist |

### 2.4 User Specific (`/api/v1/users`)

| Method | Endpoint | Auth | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/users/me/bids` | User | Retrieve personal bidding history and active leading bids |
| `GET` | `/users/me/auctions` | Seller | Retrieve seller's active and past created auctions |
| `GET` | `/users/me/watchlist` | Buyer | Retrieve user's bookmarked active auctions |
| `GET` | `/users/:id/profile` | Public | Public seller profile, stats (completed auctions, rating) |

### 2.5 Notifications (`/api/v1/notifications`)

| Method | Endpoint | Auth | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/notifications` | User | Retrieve paginated notifications (unread first) |
| `PATCH` | `/notifications/:id/read`| User | Mark single notification as read |
| `PATCH` | `/notifications/read-all`| User | Mark all notifications as read |

### 2.6 Administration & Moderation (`/api/v1/admin`)

| Method | Endpoint | Auth | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/admin/users` | Admin | List all users with status & suspension controls |
| `PATCH` | `/admin/users/:id/suspend` | Admin | Suspend or reactivate user with reason |
| `GET` | `/admin/reports` | Admin | View flagged listings and abuse reports |
| `POST` | `/admin/listings/:id/moderate` | Admin | Suspend or approve listing with moderation notes |
| `GET` | `/admin/audit-logs` | Admin | View immutable system audit trails |

---

## 3. Real-Time WebSocket Events (Socket.IO)

- **Namespace**: `/socket.io/auctions`
- **Authentication**: JWT token sent in connection handshake: `auth: { token: "Bearer ..." }`
- **Rooms**:
  - `auction:<auctionId>`: Public room for all viewers of an auction.
  - `user:<userId>`: Private authenticated room for targeted alerts (outbid, winning, moderation).

### Client to Server Events

| Event | Payload | Purpose |
| :--- | :--- | :--- |
| `auction:join` | `{ auctionId: string }` | Subscribe to live updates for an auction room |
| `auction:leave` | `{ auctionId: string }` | Unsubscribe from an auction room |

### Server to Client Broadcasts

| Event | Channel / Target | Payload Sample |
| :--- | :--- | :--- |
| `bid:accepted` | `auction:<id>` | `{ auctionId, bidId, amount, bidderName, createdAt, nextMinBid }` |
| `auction:extended` | `auction:<id>` | `{ auctionId, newEndTime, extensionCount, reason }` |
| `auction:closed` | `auction:<id>` | `{ auctionId, winnerId, winningAmount, closedAt, status }` |
| `notification:new` | `user:<userId>` | `{ id, type, title, message, data, createdAt }` |
| `auction:outbid` | `user:<previousBidderId>` | `{ auctionId, outbidAmount, title }` |
