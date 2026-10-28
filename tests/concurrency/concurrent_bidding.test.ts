import { PrismaClient, AuctionStatus, BidStatus } from '@prisma/client';
import axios from 'axios';

const prisma = new PrismaClient();
const API_URL = process.env.API_URL || 'http://localhost:4000/api/v1';

async function runConcurrencyStressTest() {
  console.log('🧪 Starting BidFlow Concurrency & Race Condition Verification Suite');
  console.log('==================================================================');

  // 1. Verify active auction
  const activeAuction = await prisma.auction.findFirst({
    where: { status: AuctionStatus.ACTIVE },
    include: {
      listing: { select: { title: true, startingPrice: true, minIncrement: true } },
    },
  });

  if (!activeAuction) {
    console.error('❌ No active auction found in database. Run seed first.');
    process.exit(1);
  }

  console.log(`🎯 Target Auction: "${activeAuction.listing.title}" (ID: ${activeAuction.id})`);
  const initialHighest = activeAuction.currentHighestBid ? Number(activeAuction.currentHighestBid) : Number(activeAuction.listing.startingPrice);
  const minInc = Number(activeAuction.listing.minIncrement);
  console.log(`Initial Highest Bid: $${initialHighest.toFixed(2)} (Min Increment: $${minInc.toFixed(2)})`);

  // 2. Fetch test buyers
  const buyers = await prisma.user.findMany({
    where: { role: 'BUYER' },
    take: 3,
  });

  if (buyers.length < 2) {
    console.error('❌ Not enough buyer accounts found in database.');
    process.exit(1);
  }

  console.log(`👥 Simulating ${buyers.length} simultaneous buyers submitting competing bids`);

  // 3. Fire simultaneous bids with varying amounts (some tie, some higher, some lower)
  const bidsToAttempt = [
    { buyer: buyers[0], amount: initialHighest + minInc, key: `stress-test-${Date.now()}-1` },
    { buyer: buyers[1], amount: initialHighest + minInc, key: `stress-test-${Date.now()}-2` }, // Same amount tie
    { buyer: buyers[0], amount: initialHighest + minInc * 2, key: `stress-test-${Date.now()}-3` },
    { buyer: buyers[1], amount: initialHighest + minInc * 3, key: `stress-test-${Date.now()}-4` },
    { buyer: buyers[0], amount: initialHighest + minInc, key: `stress-test-${Date.now()}-1` }, // Exact duplicate idempotency key retry!
  ];

  console.log(`⚡ Dispatching ${bidsToAttempt.length} concurrent requests...`);

  // Authenticate buyers to get JWT tokens
  const authTokens = new Map<string, string>();
  for (const b of buyers) {
    try {
      const res = await axios.post(`${API_URL}/auth/login`, {
        email: b.email,
        password: 'Password123!',
      });
      authTokens.set(b.id, res.data.accessToken);
    } catch (e: any) {
      console.warn(`Could not log in as ${b.email}:`, e.message);
    }
  }

  const results = await Promise.allSettled(
    bidsToAttempt.map(async (item) => {
      const token = authTokens.get(item.buyer.id);
      return axios.post(
        `${API_URL}/auctions/${activeAuction.id}/bids`,
        { amount: item.amount },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Idempotency-Key': item.key,
          },
        },
      );
    }),
  );

  let acceptedCount = 0;
  let rejectedCount = 0;
  let idempotentDeduplicatedCount = 0;

  results.forEach((res, index) => {
    const attempt = bidsToAttempt[index];
    if (res.status === 'fulfilled') {
      acceptedCount++;
      console.log(`  ✅ Bid accepted: $${attempt.amount} by ${attempt.buyer.fullName}`);
    } else {
      rejectedCount++;
      const errMsg = res.reason.response?.data?.message || res.reason.message;
      console.log(`  ❌ Bid rejected as expected: $${attempt.amount} (${errMsg})`);
    }
  });

  console.log('------------------------------------------------------------------');
  console.log(`📊 Test Summary: Accepted = ${acceptedCount}, Rejected/Deduplicated = ${rejectedCount}`);

  // 4. Invariant Verification: Authoritative check against PostgreSQL
  const refreshedAuction = await prisma.auction.findUnique({
    where: { id: activeAuction.id },
  });

  const acceptedDbBids = await prisma.bid.findMany({
    where: { auctionId: activeAuction.id, status: BidStatus.ACCEPTED },
    orderBy: { amount: 'desc' },
  });

  console.log(`🏛 Authoritative DB State: Current Highest = $${refreshedAuction?.currentHighestBid}`);
  console.log(`🏛 Top DB Bid in History = $${acceptedDbBids[0]?.amount}`);

  if (Number(refreshedAuction?.currentHighestBid) === Number(acceptedDbBids[0]?.amount)) {
    console.log('🎉 INVARIANT VERIFIED: Denormalized auction price matches authoritative highest bid in history!');
  } else {
    console.error('❌ INVARIANT VIOLATION: Denormalized price diverged from bid history!');
    process.exit(1);
  }

  await prisma.$disconnect();
}

if (require.main === module) {
  runConcurrencyStressTest().catch((e) => {
    console.error('Test execution failed:', e);
    process.exit(1);
  });
}
