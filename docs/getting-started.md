# BidFlow — Quickstart & Developer Run Guide

This guide walks you through running the entire BidFlow stack locally.

---

## Prerequisites

1. **Node.js**: v20 or v24+
2. **npm**: v10+
3. **Docker**: Docker Desktop (for PostgreSQL 16) or a local PostgreSQL instance.

---

## Step 1: Start PostgreSQL Database

If using Docker:
```bash
docker compose up -d
```
This spins up PostgreSQL 16 on port `5432` with username `postgres`, password `postgrespassword`, and database `bidflow`.

*(If using a local PostgreSQL installation, ensure your `.env` contains: `DATABASE_URL="postgresql://<user>:<password>@localhost:5432/bidflow?schema=public"`).*

---

## Step 2: Initialize Database Schema & Seed Data

Run the Prisma migration and database seed command:
```bash
# Push schema directly or run migrations
npx prisma db push --schema=prisma/schema.prisma

# Seed realistic university marketplace data
npx ts-node prisma/seed.ts
```

---

## Step 3: Run the Development Servers

You can launch both the NestJS API and React Frontend concurrently from the root directory:

```bash
# Terminal 1: Run Backend API (Port 4000)
npm run dev:api

# Terminal 2: Run Frontend Web (Port 5173)
npm run dev:web
```

Open your browser to:
**http://localhost:5173**

---

## Step 4: Pre-Seeded Test Accounts

For instant grading, interview demonstrations, and testing, click the **1-Click Demo Login** buttons on the Login page or use:

| Role | Email | Password | Description |
| :--- | :--- | :--- | :--- |
| **Buyer** | `rahul.buyer@university.edu` | `Password123!` | Active buyer with leading and outbid auctions |
| **Seller** | `alex.seller@university.edu` | `Password123!` | Senior student with active textbook & tech listings |
| **Admin** | `admin@university.edu` | `Password123!` | Campus system administrator with moderation rights |

---

## Step 5: Run Concurrency & Unit Tests

Verify database transactions and row-level locking:
```bash
# Run unit tests
npm run test --workspace=apps/api

# Run high-concurrency race condition verification
npm run test:concurrency
```
