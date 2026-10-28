import { Controller, Post, Get, Param, Body, Headers, UseGuards } from '@nestjs/common';
import { BidsService } from './bids.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';

class PlaceBidDto {
  @Type(() => Number)
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(0.01)
  amount!: number;
}

@Controller('api/v1/auctions')
export class BidsController {
  constructor(private readonly bidsService: BidsService) {}

  @UseGuards(JwtAuthGuard)
  @Post(':id/bids')
  async placeBid(
    @Param('id') auctionId: string,
    @CurrentUser('id') bidderId: string,
    @Body() dto: PlaceBidDto,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    return this.bidsService.placeBid(auctionId, bidderId, Number(dto.amount), idempotencyKey);
  }

  @Get(':id/bids')
  async getAuctionBids(@Param('id') auctionId: string) {
    return this.bidsService.getAuctionBids(auctionId);
  }
}
