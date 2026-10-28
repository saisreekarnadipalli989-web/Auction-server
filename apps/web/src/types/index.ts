export enum UserRole {
  BUYER = 'BUYER',
  SELLER = 'SELLER',
  ADMIN = 'ADMIN',
}

export enum ListingCategory {
  TEXTBOOKS = 'TEXTBOOKS',
  ELECTRONICS = 'ELECTRONICS',
  LAB_EQUIPMENT = 'LAB_EQUIPMENT',
  CALCULATORS = 'CALCULATORS',
  FURNITURE = 'FURNITURE',
  OTHER = 'OTHER',
}

export enum ListingCondition {
  BRAND_NEW = 'BRAND_NEW',
  LIKE_NEW = 'LIKE_NEW',
  GOOD = 'GOOD',
  FAIR = 'FAIR',
}

export enum AuctionStatus {
  DRAFT = 'DRAFT',
  SCHEDULED = 'SCHEDULED',
  ACTIVE = 'ACTIVE',
  CLOSED_WITH_WINNER = 'CLOSED_WITH_WINNER',
  CLOSED_WITHOUT_BIDS = 'CLOSED_WITHOUT_BIDS',
  CANCELLED = 'CANCELLED',
  SUSPENDED = 'SUSPENDED',
}

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  avatarUrl?: string;
  bio?: string;
  createdAt: string;
  stats?: {
    completedAuctions: number;
    reputationScore: number;
  };
}

export interface ListingImage {
  id: string;
  url: string;
  isPrimary: boolean;
  displayOrder: number;
}

export interface Listing {
  id: string;
  title: string;
  description: string;
  category: ListingCategory;
  condition: ListingCondition;
  startingPrice: number;
  minIncrement: number;
  sellerId: string;
  seller: {
    id: string;
    fullName: string;
    avatarUrl?: string;
    bio?: string;
  };
  images: ListingImage[];
  createdAt: string;
}

export interface Bid {
  id: string;
  auctionId: string;
  amount: number;
  bidderId: string;
  bidder: {
    id: string;
    fullName: string;
    avatarUrl?: string;
  };
  createdAt: string;
  status: 'ACCEPTED' | 'REJECTED';
}

export interface Auction {
  id: string;
  listingId: string;
  listing: Listing;
  startTime: string;
  endTime: string;
  currentHighestBid: number | null;
  currentHighestBidderId: string | null;
  currentHighestBidder?: {
    id: string;
    fullName: string;
    avatarUrl?: string;
  };
  bidCount: number;
  status: AuctionStatus;
  extensionCount: number;
  closedAt?: string;
  serverTime: string;
  timeRemainingSeconds: number;
  nextMinBid: number;
  bids?: Bid[];
  winningBid?: Bid;
}

export interface NotificationItem {
  id: string;
  type: string;
  title: string;
  message: string;
  metadata?: any;
  isRead: boolean;
  createdAt: string;
}
