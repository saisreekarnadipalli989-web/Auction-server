import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  UnprocessableEntityException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuctionGateway } from '../websocket/auction.gateway';
import { BidStatus, NotificationType, IdempotencyStatus } from '@prisma/client';
import * as crypto from 'crypto';

@Injectable()
export class BidsService {
  private readonly logger = new Logger(BidsService.name);

  constructor(
    private prisma: PrismaService,
    private auctionGateway: AuctionGateway,
  ) {}

  async placeBid(auctionId: string, bidderId: string, amount: number, idempotencyKey?: string) {
    // 1. Idempotency Check
    const requestHash = crypto
      .createHash('sha256')
      .update(JSON.stringify({ auctionId, bidderId, amount: Number(amount) }))
      .digest('hex');

    if (idempotencyKey) {
      const existingKey = await this.prisma.idempotencyRecord.findUnique({
        where: { key: idempotencyKey },
      });

      if (existingKey) {
        if (existingKey.status === IdempotencyStatus.COMPLETED) {
          if (existingKey.requestHash !== requestHash) {
            throw new UnprocessableEntityException(
              'Idempotency key reuse violation: Request payload differs from the originally committed request',
            );
          }
          this.logger.log(`Returning idempotent cached response for key: ${idempotencyKey}`);
          return existingKey.responseBody;
        }

        if (existingKey.status === IdempotencyStatus.PENDING) {
          throw new ConflictException('A bid request with this idempotency key is already processing');
        }
      } else {
        await this.prisma.idempotencyRecord.create({
          data: {
            key: idempotencyKey,
            userId: bidderId,
            action: 'PLACE_BID',
            requestHash,
            status: IdempotencyStatus.PENDING,
            expiresAt: new Date(Date.now() + 24 * 3600 * 1000), // 24 hours retention
          },
        });
      }
    }

    let postCommitActions: (() => void) | null = null;
    let resultPayload: any = null;

    try {
      // 2. Transaction with PostgreSQL Row-Level Lock
      resultPayload = await this.prisma.$transaction(async (tx) => {
        // Query auction and listing with explicit row lock
        const rows = await tx.$queryRaw<any[]>`
          SELECT 
            a.id, 
            a."listingId", 
            a."startTime", 
            a."endTime", 
            a."currentHighestBid", 
            a."currentHighestBidderId", 
            a."bidCount", 
            a.status, 
            a."extensionCount", 
            a."antiSnipeTriggerSeconds", 
            a."antiSnipeExtendSeconds",
            l."sellerId", 
            l.title as "listingTitle", 
            l."startingPrice", 
            l."minIncrement"
          FROM "Auction" a
          JOIN "Listing" l ON a."listingId" = l.id
          WHERE a.id = ${auctionId}
          FOR UPDATE OF a
        `;

        if (!rows || rows.length === 0) {
          throw new NotFoundException('Auction not found');
        }

        const auction = rows[0];
        const now = new Date();

        // Validate state
        if (auction.status !== 'ACTIVE') {
          throw new BadRequestException(`Cannot bid on auction with status: ${auction.status}`);
        }

        // Authoritative server clock validation
        if (now < new Date(auction.startTime)) {
          throw new BadRequestException('Auction has not started yet');
        }

        if (now >= new Date(auction.endTime)) {
          throw new BadRequestException('Auction has already ended');
        }

        // Self-bidding restriction
        if (auction.sellerId === bidderId) {
          throw new ForbiddenException('Sellers are prohibited from bidding on their own listings');
        }

        // Numeric threshold validation
        const currentHighest = auction.currentHighestBid ? Number(auction.currentHighestBid) : null;
        const minIncrement = Number(auction.minIncrement || 1.0);
        const startingPrice = Number(auction.startingPrice);

        const requiredMinBid = currentHighest !== null ? currentHighest + minIncrement : startingPrice;

        if (amount < requiredMinBid) {
          throw new BadRequestException(
            `Bid amount ($${amount.toFixed(2)}) is below the required minimum of $${requiredMinBid.toFixed(2)}`,
          );
        }

        // Soft-close / Anti-sniping calculation
        const antiSnipeTriggerMs = (auction.antiSnipeTriggerSeconds || 30) * 1000;
        const antiSnipeExtendMs = (auction.antiSnipeExtendSeconds || 120) * 1000;
        const timeRemainingMs = new Date(auction.endTime).getTime() - now.getTime();

        let extended = false;
        let effectiveEndTime = new Date(auction.endTime);

        if (timeRemainingMs <= antiSnipeTriggerMs) {
          effectiveEndTime = new Date(now.getTime() + antiSnipeExtendMs);
          extended = true;
          this.logger.log(
            `Soft-close triggered on auction ${auctionId}: Extended by ${auction.antiSnipeExtendSeconds}s to ${effectiveEndTime.toISOString()}`,
          );
        }

        // Insert accepted Bid
        const newBid = await tx.bid.create({
          data: {
            auctionId,
            bidderId,
            amount,
            status: BidStatus.ACCEPTED,
            idempotencyKey,
          },
          include: {
            bidder: {
              select: { id: true, fullName: true, avatarUrl: true },
            },
          },
        });

        // Atomically update Auction state
        await tx.auction.update({
          where: { id: auctionId },
          data: {
            currentHighestBid: amount,
            currentHighestBidderId: bidderId,
            bidCount: { increment: 1 },
            endTime: effectiveEndTime,
            extensionCount: extended ? { increment: 1 } : undefined,
          },
        });

        const previousBidderId = auction.currentHighestBidderId;

        // Persist outbid notification for previous leader
        if (previousBidderId && previousBidderId !== bidderId) {
          await tx.notification.create({
            data: {
              userId: previousBidderId,
              type: NotificationType.OUTBID,
              title: 'You have been outbid!',
              message: `Your previous bid on "${auction.listingTitle}" was outbid. Current highest bid is $${amount.toFixed(2)}.`,
              metadata: {
                auctionId,
                newHighestBid: amount,
                listingTitle: auction.listingTitle,
              },
            },
          });
        }

        const payload = {
          success: true,
          bid: {
            id: newBid.id,
            auctionId: newBid.auctionId,
            amount: Number(newBid.amount),
            bidderId: newBid.bidderId,
            bidderName: newBid.bidder.fullName,
            bidderAvatar: newBid.bidder.avatarUrl,
            createdAt: newBid.createdAt.toISOString(),
          },
          auction: {
            currentHighestBid: amount,
            bidCount: auction.bidCount + 1,
            endTime: effectiveEndTime.toISOString(),
            extended,
            nextMinBid: amount + minIncrement,
          },
        };

        // Update idempotency record inside transaction
        if (idempotencyKey) {
          await tx.idempotencyRecord.update({
            where: { key: idempotencyKey },
            data: {
              status: IdempotencyStatus.COMPLETED,
              responseStatus: 201,
              responseBody: payload,
            },
          });
        }

        // Prepare post-commit broadcast (strictly executed only after commit)
        postCommitActions = () => {
          this.auctionGateway.broadcastBidAccepted(auctionId, {
            auctionId,
            bidId: newBid.id,
            amount,
            bidderId,
            bidderName: newBid.bidder.fullName,
            createdAt: newBid.createdAt.toISOString(),
            nextMinBid: amount + minIncrement,
            bidCount: auction.bidCount + 1,
          });

          if (extended) {
            this.auctionGateway.broadcastAuctionExtended(auctionId, {
              auctionId,
              newEndTime: effectiveEndTime.toISOString(),
              extensionCount: auction.extensionCount + 1,
              reason: 'Anti-sniping soft close extended deadline by 2 minutes',
            });
          }

          if (previousBidderId && previousBidderId !== bidderId) {
            this.auctionGateway.sendUserOutbidAlert(previousBidderId, {
              auctionId,
              auctionTitle: auction.listingTitle,
              newHighestBid: amount,
              outbidAmount: currentHighest,
            });
          }
        };

        return payload;
      });

      // 3. Post-Commit Execution
      if (postCommitActions) {
        postCommitActions();
      }

      return resultPayload;
    } catch (error) {
      if (idempotencyKey) {
        await this.prisma.idempotencyRecord
          .delete({
            where: { key: idempotencyKey },
          })
          .catch(() => {});
      }
      throw error;
    }
  }

  async getAuctionBids(auctionId: string) {
    return this.prisma.bid.findMany({
      where: {
        auctionId,
        status: BidStatus.ACCEPTED,
      },
      include: {
        bidder: {
          select: {
            id: true,
            fullName: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }
}
