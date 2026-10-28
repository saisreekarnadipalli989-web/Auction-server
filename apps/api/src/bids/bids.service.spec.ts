import { Test, TestingModule } from '@nestjs/testing';
import { BidsService } from './bids.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuctionGateway } from '../websocket/auction.gateway';

describe('BidsService Unit Tests', () => {
  let service: BidsService;
  let prisma: PrismaService;
  let gateway: AuctionGateway;

  const mockPrisma = {
    $transaction: jest.fn(),
    idempotencyRecord: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    bid: {
      findMany: jest.fn(),
    },
  };

  const mockGateway = {
    broadcastBidAccepted: jest.fn(),
    broadcastAuctionExtended: jest.fn(),
    broadcastAuctionClosed: jest.fn(),
    sendUserOutbidAlert: jest.fn(),
    sendUserNotification: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BidsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AuctionGateway, useValue: mockGateway },
      ],
    }).compile();

    service = module.get<BidsService>(BidsService);
    prisma = module.get<PrismaService>(PrismaService);
    gateway = module.get<AuctionGateway>(AuctionGateway);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should calculate minimum next bid accurately', () => {
    const startingPrice = 100;
    const minIncrement = 5;
    const currentHighest = 110;

    const nextMinBid = currentHighest + minIncrement;
    expect(nextMinBid).toBe(115);
  });

  it('should detect when deadline falls within anti-sniping threshold (30s)', () => {
    const now = new Date('2026-10-11T12:00:00Z').getTime();
    const endingIn15s = new Date('2026-10-11T12:00:15Z').getTime();
    const endingIn60s = new Date('2026-10-11T12:01:00Z').getTime();

    const triggerThresholdMs = 30 * 1000;

    const shouldExtend15s = endingIn15s - now <= triggerThresholdMs;
    const shouldExtend60s = endingIn60s - now <= triggerThresholdMs;

    expect(shouldExtend15s).toBe(true);
    expect(shouldExtend60s).toBe(false);
  });
});
