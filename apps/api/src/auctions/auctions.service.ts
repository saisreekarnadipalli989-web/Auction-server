import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuctionStatus, ListingCategory } from '@prisma/client';

@Injectable()
export class AuctionsService {
  constructor(private prisma: PrismaService) {}

  async findAll(query: {
    status?: AuctionStatus;
    category?: ListingCategory;
    sort?: 'endingSoon' | 'highestBid' | 'newest' | 'mostBids';
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(query.limit) || 12));
    const skip = (page - 1) * limit;

    const where: any = {};

    if (query.status) {
      where.status = query.status;
    } else {
      // Default to active or scheduled
      where.status = {
        in: [AuctionStatus.ACTIVE, AuctionStatus.SCHEDULED],
      };
    }

    if (query.category) {
      where.listing = {
        category: query.category,
      };
    }

    let orderBy: any = { endTime: 'asc' }; // Default endingSoon

    if (query.sort === 'highestBid') {
      orderBy = { currentHighestBid: 'desc' };
    } else if (query.sort === 'newest') {
      orderBy = { createdAt: 'desc' };
    } else if (query.sort === 'mostBids') {
      orderBy = { bidCount: 'desc' };
    }

    const [total, items] = await Promise.all([
      this.prisma.auction.count({ where }),
      this.prisma.auction.findMany({
        where,
        include: {
          listing: {
            include: {
              images: { orderBy: { displayOrder: 'asc' } },
              seller: {
                select: { id: true, fullName: true, avatarUrl: true },
              },
            },
          },
          currentHighestBidder: {
            select: { id: true, fullName: true },
          },
        },
        orderBy,
        skip,
        take: limit,
      }),
    ]);

    const now = new Date();

    const formattedItems = items.map((a) => {
      const remainingMs = Math.max(0, new Date(a.endTime).getTime() - now.getTime());
      return {
        ...a,
        serverTime: now.toISOString(),
        timeRemainingSeconds: Math.floor(remainingMs / 1000),
      };
    });

    return {
      items: formattedItems,
      serverTime: now.toISOString(),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const auction = await this.prisma.auction.findUnique({
      where: { id },
      include: {
        listing: {
          include: {
            images: { orderBy: { displayOrder: 'asc' } },
            seller: {
              select: {
                id: true,
                fullName: true,
                avatarUrl: true,
                bio: true,
                createdAt: true,
              },
            },
          },
        },
        currentHighestBidder: {
          select: { id: true, fullName: true, avatarUrl: true },
        },
        winningBid: {
          include: {
            bidder: { select: { id: true, fullName: true, avatarUrl: true } },
          },
        },
        bids: {
          where: { status: 'ACCEPTED' },
          orderBy: { createdAt: 'desc' },
          take: 30,
          include: {
            bidder: { select: { id: true, fullName: true, avatarUrl: true } },
          },
        },
        _count: {
          select: { watchlists: true },
        },
      },
    });

    if (!auction) {
      throw new NotFoundException('Auction not found');
    }

    const now = new Date();
    const remainingMs = Math.max(0, new Date(auction.endTime).getTime() - now.getTime());

    const minIncrement = Number(auction.listing.minIncrement || 1.0);
    const currentHighest = auction.currentHighestBid ? Number(auction.currentHighestBid) : null;
    const nextMinBid = currentHighest !== null ? currentHighest + minIncrement : Number(auction.listing.startingPrice);

    return {
      ...auction,
      serverTime: now.toISOString(),
      timeRemainingSeconds: Math.floor(remainingMs / 1000),
      nextMinBid,
    };
  }

  async toggleWatchlist(userId: string, auctionId: string) {
    const existing = await this.prisma.watchlist.findUnique({
      where: {
        userId_auctionId: { userId, auctionId },
      },
    });

    if (existing) {
      await this.prisma.watchlist.delete({
        where: { id: existing.id },
      });
      return { isWatchlisted: false };
    } else {
      await this.prisma.watchlist.create({
        data: { userId, auctionId },
      });
      return { isWatchlisted: true };
    }
  }
}
