import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ListingCategory, ListingCondition, ListingStatus, AuctionStatus } from '@prisma/client';

export interface CreateListingInput {
  title: string;
  description: string;
  category: ListingCategory;
  condition: ListingCondition;
  startingPrice: number;
  minIncrement?: number;
  reservePrice?: number;
  imageUrls: string[];
  scheduleAuction?: boolean;
  startTime?: string;
  endTime?: string;
  durationHours?: number;
}

@Injectable()
export class ListingsService {
  constructor(private prisma: PrismaService) {}

  async createListing(sellerId: string, input: CreateListingInput) {
    const minIncrement = input.minIncrement && input.minIncrement > 0 ? input.minIncrement : 1.0;

    return this.prisma.$transaction(async (tx) => {
      const listing = await tx.listing.create({
        data: {
          sellerId,
          title: input.title.trim(),
          description: input.description.trim(),
          category: input.category,
          condition: input.condition,
          startingPrice: input.startingPrice,
          minIncrement,
          reservePrice: input.reservePrice,
          status: ListingStatus.PUBLISHED,
          images: {
            create: input.imageUrls.map((url, idx) => ({
              url,
              isPrimary: idx === 0,
              displayOrder: idx,
            })),
          },
        },
        include: {
          images: true,
          seller: {
            select: { id: true, fullName: true, avatarUrl: true, email: true },
          },
        },
      });

      // Default or custom auction scheduling
      if (input.scheduleAuction !== false) {
        const now = new Date();
        const start = input.startTime ? new Date(input.startTime) : now;
        
        let end: Date;
        if (input.endTime) {
          end = new Date(input.endTime);
        } else {
          const duration = input.durationHours && input.durationHours > 0 ? input.durationHours : 24;
          end = new Date(start.getTime() + duration * 3600 * 1000);
        }

        if (end <= start) {
          throw new BadRequestException('Auction end time must be after the start time');
        }

        const initialStatus = start <= now ? AuctionStatus.ACTIVE : AuctionStatus.SCHEDULED;

        const auction = await tx.auction.create({
          data: {
            listingId: listing.id,
            startTime: start,
            endTime: end,
            originalEndTime: end,
            status: initialStatus,
            currentHighestBid: input.startingPrice,
          },
        });

        return {
          ...listing,
          auction,
        };
      }

      return listing;
    });
  }

  async findAll(query: {
    search?: string;
    category?: ListingCategory;
    condition?: ListingCondition;
    minPrice?: number;
    maxPrice?: number;
    status?: AuctionStatus;
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(query.limit) || 12));
    const skip = (page - 1) * limit;

    const where: any = {
      status: ListingStatus.PUBLISHED,
    };

    if (query.category) {
      where.category = query.category;
    }

    if (query.condition) {
      where.condition = query.condition;
    }

    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    if (query.status) {
      where.auction = {
        status: query.status,
      };
    }

    const [total, items] = await Promise.all([
      this.prisma.listing.count({ where }),
      this.prisma.listing.findMany({
        where,
        include: {
          images: {
            orderBy: { displayOrder: 'asc' },
          },
          seller: {
            select: { id: true, fullName: true, avatarUrl: true },
          },
          auction: {
            include: {
              currentHighestBidder: {
                select: { id: true, fullName: true },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const listing = await this.prisma.listing.findUnique({
      where: { id },
      include: {
        images: {
          orderBy: { displayOrder: 'asc' },
        },
        seller: {
          select: {
            id: true,
            fullName: true,
            avatarUrl: true,
            bio: true,
            createdAt: true,
            _count: {
              select: { listings: true },
            },
          },
        },
        auction: {
          include: {
            currentHighestBidder: {
              select: { id: true, fullName: true },
            },
            bids: {
              orderBy: { createdAt: 'desc' },
              take: 20,
              include: {
                bidder: {
                  select: { id: true, fullName: true, avatarUrl: true },
                },
              },
            },
          },
        },
      },
    });

    if (!listing) {
      throw new NotFoundException('Listing not found');
    }

    return listing;
  }

  async deleteListing(id: string, userId: string, isAdmin = false) {
    const listing = await this.prisma.listing.findUnique({
      where: { id },
      include: { auction: true },
    });

    if (!listing) {
      throw new NotFoundException('Listing not found');
    }

    if (listing.sellerId !== userId && !isAdmin) {
      throw new ForbiddenException('You are not authorized to delete this listing');
    }

    if (listing.auction && listing.auction.bidCount > 0) {
      throw new BadRequestException('Cannot delete listing once bids have been placed on its auction');
    }

    return this.prisma.listing.delete({
      where: { id },
    });
  }
}
