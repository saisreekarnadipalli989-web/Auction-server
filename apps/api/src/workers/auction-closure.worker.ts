import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuctionGateway } from '../websocket/auction.gateway';
import { AuctionStatus, BidStatus, NotificationType } from '@prisma/client';

@Injectable()
export class AuctionClosureWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AuctionClosureWorker.name);
  private timer: NodeJS.Timeout | null = null;
  private isProcessing = false;

  constructor(
    private prisma: PrismaService,
    private auctionGateway: AuctionGateway,
  ) {}

  onModuleInit() {
    const intervalMs = Number(process.env.CLOSURE_WORKER_INTERVAL_MS) || 10000;
    this.logger.log(`Starting reliable database-backed auction closure worker (interval: ${intervalMs}ms)`);
    this.timer = setInterval(() => this.processOverdueAuctions(), intervalMs);
    // Trigger initial check
    setTimeout(() => this.processOverdueAuctions(), 2000);
  }

  onModuleDestroy() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  async processOverdueAuctions() {
    if (this.isProcessing) {
      return; // Prevent overlapping runs in same instance
    }

    this.isProcessing = true;

    try {
      // 1. Also activate scheduled auctions whose startTime has arrived
      await this.activateScheduledAuctions();

      // 2. Select overdue active auctions using SKIP LOCKED
      // Guarantees at-least-once execution and zero duplicate workers
      const overdueRows = await this.prisma.$queryRaw<{ id: string }[]>`
        SELECT id FROM "Auction"
        WHERE status = 'ACTIVE' AND "endTime" <= NOW()
        ORDER BY "endTime" ASC
        LIMIT 25
        FOR UPDATE SKIP LOCKED
      `;

      if (overdueRows.length === 0) {
        return;
      }

      this.logger.log(`Found ${overdueRows.length} overdue active auction(s) to finalize`);

      for (const row of overdueRows) {
        await this.finalizeAuction(row.id);
      }
    } catch (error) {
      this.logger.error('Error during auction closure cycle:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  private async activateScheduledAuctions() {
    try {
      const scheduledToActivate = await this.prisma.auction.updateMany({
        where: {
          status: AuctionStatus.SCHEDULED,
          startTime: { lte: new Date() },
        },
        data: {
          status: AuctionStatus.ACTIVE,
        },
      });

      if (scheduledToActivate.count > 0) {
        this.logger.log(`Activated ${scheduledToActivate.count} scheduled auction(s) whose start time arrived`);
      }
    } catch (err) {
      this.logger.error('Failed to activate scheduled auctions:', err);
    }
  }

  private async finalizeAuction(auctionId: string) {
    let postCommitBroadcast: (() => void) | null = null;

    try {
      await this.prisma.$transaction(async (tx) => {
        // Fetch auction details inside transaction
        const auction = await tx.auction.findUnique({
          where: { id: auctionId },
          include: {
            listing: {
              select: {
                id: true,
                title: true,
                sellerId: true,
                startingPrice: true,
              },
            },
          },
        });

        if (!auction || auction.status !== AuctionStatus.ACTIVE) {
          return;
        }

        // Query the authoritative highest accepted bid
        const winningBid = await tx.bid.findFirst({
          where: {
            auctionId: auction.id,
            status: BidStatus.ACCEPTED,
          },
          orderBy: { amount: 'desc' },
          include: {
            bidder: {
              select: { id: true, fullName: true },
            },
          },
        });

        const now = new Date();

        if (winningBid) {
          // Closed with winner
          await tx.auction.update({
            where: { id: auction.id },
            data: {
              status: AuctionStatus.CLOSED_WITH_WINNER,
              winningBidId: winningBid.id,
              currentHighestBid: winningBid.amount,
              currentHighestBidderId: winningBid.bidderId,
              closedAt: now,
            },
          });

          // Notification to winning buyer
          await tx.notification.create({
            data: {
              userId: winningBid.bidderId,
              type: NotificationType.AUCTION_WON,
              title: 'Congratulations! You won the auction!',
              message: `You won "${auction.listing.title}" with a final bid of $${Number(winningBid.amount).toFixed(2)}.`,
              metadata: {
                auctionId: auction.id,
                amount: Number(winningBid.amount),
                listingTitle: auction.listing.title,
              },
            },
          });

          // Notification to seller
          await tx.notification.create({
            data: {
              userId: auction.listing.sellerId,
              type: NotificationType.AUCTION_CLOSED,
              title: 'Your auction concluded successfully!',
              message: `"${auction.listing.title}" sold to ${winningBid.bidder.fullName} for $${Number(winningBid.amount).toFixed(2)}.`,
              metadata: {
                auctionId: auction.id,
                winningAmount: Number(winningBid.amount),
                winnerId: winningBid.bidderId,
              },
            },
          });

          this.logger.log(
            `Auction ${auction.id} closed with winner: ${winningBid.bidder.fullName} ($${winningBid.amount})`,
          );

          postCommitBroadcast = () => {
            this.auctionGateway.broadcastAuctionClosed(auction.id, {
              auctionId: auction.id,
              status: AuctionStatus.CLOSED_WITH_WINNER,
              winnerId: winningBid.bidderId,
              winningBidderName: winningBid.bidder.fullName,
              winningAmount: Number(winningBid.amount),
              closedAt: now.toISOString(),
            });
          };
        } else {
          // Closed without bids
          await tx.auction.update({
            where: { id: auction.id },
            data: {
              status: AuctionStatus.CLOSED_WITHOUT_BIDS,
              closedAt: now,
            },
          });

          // Notification to seller
          await tx.notification.create({
            data: {
              userId: auction.listing.sellerId,
              type: NotificationType.AUCTION_CLOSED,
              title: 'Auction closed without bids',
              message: `Your listing "${auction.listing.title}" expired with no bids placed.`,
              metadata: {
                auctionId: auction.id,
                listingTitle: auction.listing.title,
              },
            },
          });

          this.logger.log(`Auction ${auction.id} closed with no bids`);

          postCommitBroadcast = () => {
            this.auctionGateway.broadcastAuctionClosed(auction.id, {
              auctionId: auction.id,
              status: AuctionStatus.CLOSED_WITHOUT_BIDS,
              winnerId: null,
              winningBidderName: null,
              winningAmount: null,
              closedAt: now.toISOString(),
            });
          };
        }
      });

      if (postCommitBroadcast) {
        postCommitBroadcast();
      }
    } catch (err) {
      this.logger.error(`Failed to finalize auction ${auctionId}:`, err);
    }
  }
}
