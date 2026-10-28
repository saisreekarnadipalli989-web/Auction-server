import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuctionStatus, ReportStatus, ListingStatus } from '@prisma/client';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  async getAllUsers() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        avatarUrl: true,
        isSuspended: true,
        createdAt: true,
        _count: {
          select: { listings: true, bids: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async setUserSuspension(targetUserId: string, isSuspended: boolean, adminId: string, reason: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: targetUserId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.id === adminId) {
      throw new BadRequestException('Administrators cannot suspend their own account');
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.user.update({
        where: { id: targetUserId },
        data: { isSuspended },
      });

      await tx.auditLog.create({
        data: {
          actorId: adminId,
          action: isSuspended ? 'SUSPEND_USER' : 'UNSUSPEND_USER',
          entityType: 'User',
          entityId: targetUserId,
          payload: { reason, targetEmail: user.email },
        },
      });

      return updated;
    });
  }

  async getReports() {
    return this.prisma.listingReport.findMany({
      include: {
        listing: {
          select: { id: true, title: true, sellerId: true },
        },
        reporter: {
          select: { id: true, fullName: true, email: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async moderateListing(
    listingId: string,
    action: 'SUSPEND' | 'APPROVE',
    adminId: string,
    notes: string,
  ) {
    const listing = await this.prisma.listing.findUnique({
      where: { id: listingId },
      include: { auction: true },
    });

    if (!listing) {
      throw new NotFoundException('Listing not found');
    }

    return this.prisma.$transaction(async (tx) => {
      if (action === 'SUSPEND') {
        if (listing.auction) {
          await tx.auction.update({
            where: { id: listing.auction.id },
            data: { status: AuctionStatus.SUSPENDED },
          });
        }

        await tx.listing.update({
          where: { id: listingId },
          data: { status: ListingStatus.ARCHIVED },
        });
      } else if (action === 'APPROVE') {
        if (listing.auction && listing.auction.status === AuctionStatus.SUSPENDED) {
          await tx.auction.update({
            where: { id: listing.auction.id },
            data: { status: AuctionStatus.ACTIVE },
          });
        }
      }

      await tx.listingReport.updateMany({
        where: { listingId, status: ReportStatus.PENDING },
        data: {
          status: ReportStatus.RESOLVED,
          reviewedById: adminId,
          reviewedAt: new Date(),
          resolutionNotes: notes,
        },
      });

      await tx.auditLog.create({
        data: {
          actorId: adminId,
          action: `MODERATE_LISTING_${action}`,
          entityType: 'Listing',
          entityId: listingId,
          payload: { notes, title: listing.title },
        },
      });

      return { success: true, listingId, action };
    });
  }

  async getAuditLogs() {
    return this.prisma.auditLog.findMany({
      include: {
        actor: {
          select: { id: true, fullName: true, email: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }
}
