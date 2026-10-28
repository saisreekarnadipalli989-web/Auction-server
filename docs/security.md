# BidFlow — Security, Concurrency & Operational Invariants

## 1. Concurrency Controls & Race Condition Mitigations

### 1.1 The Double-Spend & Lost-Update Problem in Online Auctions
In an online auction, naive implementations read the current highest bid into application memory, compare it against the user's incoming bid, and if valid, write the new bid back.
When two requests arrive within milliseconds (e.g. at 12:00:00.100 and 12:00:00.105):
- Request A reads Current = \$100, Validates bid \$105.
- Request B reads Current = \$100, Validates bid \$105.
- Both write \$105, or Request A writes \$110 and Request B writes \$105 afterward, overwriting the higher bid.

### 1.2 Pessimistic Row Locking Solution
BidFlow enforces atomic serialization at the database layer using PostgreSQL's row-level lock:
```sql
BEGIN;
SELECT * FROM "auctions" WHERE id = $1 FOR UPDATE;
-- All concurrent requests for this auction row are put in a kernel wait queue
-- Read current authoritative state directly from row
-- Validate bid >= currentHighestBid + minIncrement
-- Insert into "bids"
-- Update "auctions"
COMMIT; -- Lock released immediately for the next queued transaction
```

### 1.3 Deadlock Prevention
Locks are acquired in a deterministic order across all transactions:
1. Always acquire `auctions` row lock first (`id = $auctionId`).
2. Never acquire locks on multiple auctions within the same user transaction.
3. Keep the transaction duration minimal (no external HTTP calls, no email sending, no WebSocket emissions inside the database transaction).

---

## 2. Authentication & Authorization Security

1. **Password Hashing**: Uses **Argon2id** (memory cost: 65536 KB, time cost: 3 iterations, parallelism: 4) or Bcrypt with high cost factor. Salt is randomly generated per user.
2. **Access Tokens**: Short-lived JSON Web Tokens (JWT) signed with HS256/RS256 secret.
3. **Role-Based Access Control (RBAC)**:
   - Evaluated exclusively on the server using NestJS Guards (`JwtAuthGuard`, `RolesGuard`).
   - Sellers cannot bid on their own listings.
   - Bidders cannot alter listing content.
   - Only Admins can execute moderation endpoints.

---

## 3. Network & Transport Security

1. **CORS Configuration**: Restrict origins in production to designated frontend domains.
2. **Rate Limiting**: Throttler module active on sensitive routes (`/auth/login`, `/auth/register`, `/auctions/:id/bids`).
3. **Input Validation**: Strict Zod and class-validator schemas with `whitelist: true, forbidNonWhitelisted: true` preventing mass-assignment attacks.
4. **Authoritative Clock**: System never accepts client timestamps for bid validity or closing times; all decisions rely on UTC server clock.
