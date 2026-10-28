import { PrismaClient, UserRole, ListingCategory, ListingCondition, ListingStatus, AuctionStatus, BidStatus, NotificationType } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// Pre-computed bcrypt hash (cost 10) for 'Password123!'
// Guarantees instant zero-dependency execution across both CJS and ESM environments
const DEFAULT_PASSWORD_HASH = '$2a$10$0MsJkncgkc4huayhSiI.Petgi26Ke6Hci1mUTu.Mm2aEg80SnAp1.';

async function main() {
  console.log('🌱 Starting BidFlow database seed...');

  // Clean existing tables in proper cascade order
  await prisma.notification.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.idempotencyRecord.deleteMany();
  await prisma.sellerFeedback.deleteMany();
  await prisma.listingReport.deleteMany();
  await prisma.watchlist.deleteMany();
  await prisma.bid.deleteMany();
  await prisma.auction.deleteMany();
  await prisma.listingImage.deleteMany();
  await prisma.listing.deleteMany();
  await prisma.user.deleteMany();

  const defaultPasswordHash = DEFAULT_PASSWORD_HASH;

  // 1. Create Core Users
  const admin = await prisma.user.create({
    data: {
      email: 'admin@university.edu',
      passwordHash: defaultPasswordHash,
      fullName: 'Campus Moderator Admin',
      role: UserRole.ADMIN,
      bio: 'Department of Computer Science & Engineering System Administrator.',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    },
  });

  const seller1 = await prisma.user.create({
    data: {
      email: 'alex.seller@university.edu',
      passwordHash: defaultPasswordHash,
      fullName: 'Alex Chen (CSE Senior)',
      role: UserRole.SELLER,
      bio: 'Graduating senior clearing out algorithms textbooks, MacBooks, and hardware.',
      avatarUrl: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150',
    },
  });

  const seller2 = await prisma.user.create({
    data: {
      email: 'sarah.lab@university.edu',
      passwordHash: defaultPasswordHash,
      fullName: 'Sarah Jenkins (ECE Lab Assistant)',
      role: UserRole.SELLER,
      bio: 'Surplus electronics, graphing calculators, and test equipment.',
      avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
    },
  });

  const buyer1 = await prisma.user.create({
    data: {
      email: 'rahul.buyer@university.edu',
      passwordHash: defaultPasswordHash,
      fullName: 'Rahul Sharma (Sophomore)',
      role: UserRole.BUYER,
      bio: 'Looking for 3rd semester CS core books and electronics.',
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
    },
  });

  const buyer2 = await prisma.user.create({
    data: {
      email: 'priya.buyer@university.edu',
      passwordHash: defaultPasswordHash,
      fullName: 'Priya Patel (Junior)',
      role: UserRole.BUYER,
      bio: 'Data Science major searching for GPU gear and textbooks.',
      avatarUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150',
    },
  });

  const buyer3 = await prisma.user.create({
    data: {
      email: 'david.buyer@university.edu',
      passwordHash: defaultPasswordHash,
      fullName: 'David Miller (Freshman)',
      role: UserRole.BUYER,
      bio: 'Incoming freshman shopping for graphing calculators and essentials.',
      avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
    },
  });

  console.log('✅ Users created: 1 Admin, 2 Sellers, 3 Buyers');

  const now = new Date();

  // Helper function to create an auction with full relations
  async function createAuctionItem(data: {
    sellerId: string;
    title: string;
    description: string;
    category: ListingCategory;
    condition: ListingCondition;
    startingPrice: number;
    minIncrement: number;
    imageUrl: string;
    startTime: Date;
    endTime: Date;
    status: AuctionStatus;
    bids?: { bidderId: string; amount: number; offsetMinutes: number }[];
  }) {
    const listing = await prisma.listing.create({
      data: {
        sellerId: data.sellerId,
        title: data.title,
        description: data.description,
        category: data.category,
        condition: data.condition,
        startingPrice: data.startingPrice,
        minIncrement: data.minIncrement,
        status: ListingStatus.PUBLISHED,
        images: {
          create: [{ url: data.imageUrl, isPrimary: true, displayOrder: 0 }],
        },
      },
    });

    const auction = await prisma.auction.create({
      data: {
        listingId: listing.id,
        startTime: data.startTime,
        endTime: data.endTime,
        originalEndTime: data.endTime,
        status: data.status,
        currentHighestBid: data.startingPrice,
      },
    });

    if (data.bids && data.bids.length > 0) {
      let lastBidId: string | null = null;
      let lastBidderId: string | null = null;
      let maxAmount = data.startingPrice;

      for (const b of data.bids) {
        const bidTime = new Date(data.startTime.getTime() + b.offsetMinutes * 60000);
        const bid = await prisma.bid.create({
          data: {
            auctionId: auction.id,
            bidderId: b.bidderId,
            amount: b.amount,
            status: BidStatus.ACCEPTED,
            createdAt: bidTime,
          },
        });
        lastBidId = bid.id;
        lastBidderId = b.bidderId;
        maxAmount = b.amount;
      }

      await prisma.auction.update({
        where: { id: auction.id },
        data: {
          currentHighestBid: maxAmount,
          currentHighestBidderId: lastBidderId,
          bidCount: data.bids.length,
          winningBidId: data.status === AuctionStatus.CLOSED_WITH_WINNER ? lastBidId : null,
          closedAt: data.status === AuctionStatus.CLOSED_WITH_WINNER ? data.endTime : null,
        },
      });
    }

    return auction;
  }

  // 1. ACTIVE Auction: CLRS Algorithms Textbook (Closing in 2 hours)
  const a1 = await createAuctionItem({
    sellerId: seller1.id,
    title: 'Introduction to Algorithms (CLRS 4th Edition) - Hardcover',
    description: 'Mint condition hardcover 4th edition. No highlights, no dog-eared pages. Used for one semester in CS301. Includes online code companion access code.',
    category: ListingCategory.TEXTBOOKS,
    condition: ListingCondition.LIKE_NEW,
    startingPrice: 40.00,
    minIncrement: 5.00,
    imageUrl: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600',
    startTime: new Date(now.getTime() - 24 * 3600000), // Started 1 day ago
    endTime: new Date(now.getTime() + 2 * 3600000),   // Closes in 2 hours
    status: AuctionStatus.ACTIVE,
    bids: [
      { bidderId: buyer1.id, amount: 45.00, offsetMinutes: 60 },
      { bidderId: buyer2.id, amount: 55.00, offsetMinutes: 180 },
      { bidderId: buyer1.id, amount: 65.00, offsetMinutes: 300 },
    ],
  });

  // 2. ACTIVE Auction: TI-84 Plus CE Graphing Calculator (Ending Soon in 15 minutes!)
  const a2 = await createAuctionItem({
    sellerId: seller2.id,
    title: 'Texas Instruments TI-84 Plus CE Color Graphing Calculator',
    description: 'Rechargeable battery, crisp color screen. Essential for Calculus, Linear Algebra, and Statistics. Comes with original slide cover and charging cable.',
    category: ListingCategory.CALCULATORS,
    condition: ListingCondition.GOOD,
    startingPrice: 35.00,
    minIncrement: 2.50,
    imageUrl: 'https://images.unsplash.com/photo-1594980596870-8aa52a78d8cd?w=600',
    startTime: new Date(now.getTime() - 12 * 3600000),
    endTime: new Date(now.getTime() + 15 * 60000), // Closes in 15 minutes!
    status: AuctionStatus.ACTIVE,
    bids: [
      { bidderId: buyer3.id, amount: 37.50, offsetMinutes: 30 },
      { bidderId: buyer1.id, amount: 42.00, offsetMinutes: 90 },
      { bidderId: buyer3.id, amount: 48.00, offsetMinutes: 150 },
    ],
  });

  // 3. ACTIVE Auction: MacBook Pro M2 (16GB RAM, 512GB SSD)
  const a3 = await createAuctionItem({
    sellerId: seller1.id,
    title: 'Apple MacBook Pro 14" M2 Pro (16GB RAM / 512GB SSD) - Space Gray',
    description: 'Flawless condition, battery health 96%, only 42 cycle counts. Clean keyboard, original 67W MagSafe fast charger included. Upgrading to desktop setup.',
    category: ListingCategory.ELECTRONICS,
    condition: ListingCondition.LIKE_NEW,
    startingPrice: 850.00,
    minIncrement: 25.00,
    imageUrl: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=600',
    startTime: new Date(now.getTime() - 6 * 3600000),
    endTime: new Date(now.getTime() + 36 * 3600000), // Closes in 36 hours
    status: AuctionStatus.ACTIVE,
    bids: [
      { bidderId: buyer2.id, amount: 900.00, offsetMinutes: 60 },
      { bidderId: buyer1.id, amount: 950.00, offsetMinutes: 120 },
    ],
  });

  // 4. ACTIVE Auction: Digital Storage Oscilloscope 100MHz Dual Channel
  const a4 = await createAuctionItem({
    sellerId: seller2.id,
    title: 'Rigol DS1054Z Digital Storage Oscilloscope (Upgraded 100MHz 4-CH)',
    description: 'Ideal for circuit analysis, microcontrollers, and senior design projects. Includes 4 passive probes, USB cable, and power lead.',
    category: ListingCategory.LAB_EQUIPMENT,
    condition: ListingCondition.GOOD,
    startingPrice: 180.00,
    minIncrement: 10.00,
    imageUrl: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=600',
    startTime: new Date(now.getTime() - 10 * 3600000),
    endTime: new Date(now.getTime() + 18 * 3600000),
    status: AuctionStatus.ACTIVE,
    bids: [
      { bidderId: buyer2.id, amount: 190.00, offsetMinutes: 120 },
    ],
  });

  // 5. SCHEDULED Auction: Raspberry Pi 4 Model B (8GB) + IoT Sensor Kit
  await createAuctionItem({
    sellerId: seller1.id,
    title: 'Raspberry Pi 4 Model B (8GB RAM) + 64GB MicroSD + 37-Sensor Kit',
    description: 'Complete IoT laboratory kit used in embedded systems capstone. Includes active cooling aluminum armor case, official USB-C power supply, and HDMI adapter.',
    category: ListingCategory.ELECTRONICS,
    condition: ListingCondition.LIKE_NEW,
    startingPrice: 60.00,
    minIncrement: 5.00,
    imageUrl: 'https://images.unsplash.com/photo-1608178398319-48f814d0750c?w=600',
    startTime: new Date(now.getTime() + 6 * 3600000), // Starts in 6 hours
    endTime: new Date(now.getTime() + 48 * 3600000),
    status: AuctionStatus.SCHEDULED,
  });

  // 6. CLOSED_WITH_WINNER: Sony WH-1000XM4 Noise Cancelling Headphones
  await createAuctionItem({
    sellerId: seller1.id,
    title: 'Sony WH-1000XM4 Wireless Noise-Canceling Headphones - Black',
    description: 'Perfect for campus library study sessions. Clean earpads, comes with hard carry case, 3.5mm cable, and airplane adapter. Battery holds 30h charge.',
    category: ListingCategory.ELECTRONICS,
    condition: ListingCondition.GOOD,
    startingPrice: 100.00,
    minIncrement: 10.00,
    imageUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600',
    startTime: new Date(now.getTime() - 48 * 3600000),
    endTime: new Date(now.getTime() - 2 * 3600000), // Closed 2 hours ago
    status: AuctionStatus.CLOSED_WITH_WINNER,
    bids: [
      { bidderId: buyer1.id, amount: 120.00, offsetMinutes: 60 },
      { bidderId: buyer3.id, amount: 140.00, offsetMinutes: 180 },
      { bidderId: buyer2.id, amount: 165.00, offsetMinutes: 300 }, // Winner!
    ],
  });

  // 7. CLOSED_WITHOUT_BIDS: Organic Chemistry 3D Molecular Model Set
  await createAuctionItem({
    sellerId: seller2.id,
    title: 'Prentice Hall Molecular Model Set for Organic Chemistry',
    description: 'Complete 240 piece ball-and-spoke molecular model kit with link-remover tool. No missing atoms.',
    category: ListingCategory.LAB_EQUIPMENT,
    condition: ListingCondition.LIKE_NEW,
    startingPrice: 20.00,
    minIncrement: 2.00,
    imageUrl: 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=600',
    startTime: new Date(now.getTime() - 72 * 3600000),
    endTime: new Date(now.getTime() - 12 * 3600000),
    status: AuctionStatus.CLOSED_WITHOUT_BIDS,
  });

  // 8. Add sample Watchlist records
  await prisma.watchlist.createMany({
    data: [
      { userId: buyer1.id, auctionId: a2.id },
      { userId: buyer1.id, auctionId: a3.id },
      { userId: buyer2.id, auctionId: a1.id },
      { userId: buyer3.id, auctionId: a2.id },
    ],
  });

  // 9. Add initial in-app notifications
  await prisma.notification.createMany({
    data: [
      {
        userId: buyer1.id,
        type: NotificationType.OUTBID,
        title: 'You have been outbid!',
        message: 'Your bid of $45.00 on "Introduction to Algorithms (CLRS 4th Edition)" was outbid by $65.00.',
        metadata: { auctionId: a1.id, currentPrice: 65.00 },
      },
      {
        userId: buyer2.id,
        type: NotificationType.AUCTION_WON,
        title: 'Congratulations! You won the auction!',
        message: 'You won "Sony WH-1000XM4 Wireless Noise-Canceling Headphones" with a final bid of $165.00.',
        metadata: { winningAmount: 165.00 },
      },
    ],
  });

  console.log('✅ Realistic Campus Auction Listings & Bids Seeded Successfully!');
  console.log('---------------------------------------------------------');
  console.log('Demo Credentials for Instant Testing:');
  console.log('• Admin:  admin@university.edu       (Password: Password123!)');
  console.log('• Seller: alex.seller@university.edu  (Password: Password123!)');
  console.log('• Buyer:  rahul.buyer@university.edu  (Password: Password123!)');
  console.log('---------------------------------------------------------');
}

main()
  .catch((e) => {
    console.error('❌ Error running seed script:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
