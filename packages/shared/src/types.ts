import { z } from 'zod';
import {
  UserRole,
  ListingCategory,
  ListingCondition,
  ListingStatus,
  AuctionStatus,
  BidStatus,
  NotificationType,
  ReportReason,
  ReportStatus,
} from './enums';

// Auth Schemas
export const RegisterSchema = z.object({
  email: z.string().email('Please provide a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters long'),
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
  role: z.nativeEnum(UserRole).default(UserRole.BUYER),
  bio: z.string().optional(),
});

export type RegisterDto = z.infer<typeof RegisterSchema>;

export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1, 'Password is required'),
});

export type LoginDto = z.infer<typeof LoginSchema>;

// Listing Schemas
export const CreateListingSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(200),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  category: z.nativeEnum(ListingCategory),
  condition: z.nativeEnum(ListingCondition),
  startingPrice: z.number().positive('Starting price must be greater than zero'),
  minIncrement: z.number().positive().default(1.0),
  reservePrice: z.number().positive().optional(),
  imageUrls: z.array(z.string().url()).min(1, 'At least one image is required'),
  // Optional inline auction scheduling
  scheduleAuction: z.boolean().default(true),
  startTime: z.string().datetime().optional(), // ISO string
  endTime: z.string().datetime().optional(),   // ISO string
  durationHours: z.number().int().positive().optional(), // Helper for easy duration
});

export type CreateListingDto = z.infer<typeof CreateListingSchema>;

// Bid Submission Schema
export const PlaceBidSchema = z.object({
  amount: z.number().positive('Bid amount must be positive'),
});

export type PlaceBidDto = z.infer<typeof PlaceBidSchema>;

// WebSocket Event Payloads
export interface BidAcceptedPayload {
  auctionId: string;
  bidId: string;
  amount: number;
  bidderId: string;
  bidderName: string;
  createdAt: string;
  nextMinBid: number;
  bidCount: number;
}

export interface AuctionExtendedPayload {
  auctionId: string;
  newEndTime: string;
  extensionCount: number;
  reason: string;
}

export interface AuctionClosedPayload {
  auctionId: string;
  status: AuctionStatus;
  winnerId: string | null;
  winningBidderName: string | null;
  winningAmount: number | null;
  closedAt: string;
}

export interface OutbidAlertPayload {
  auctionId: string;
  auctionTitle: string;
  newHighestBid: number;
  outbidAmount: number;
}
