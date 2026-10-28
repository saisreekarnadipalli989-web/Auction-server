import { Controller, Get, Post, Delete, Param, Query, UseGuards } from '@nestjs/common';
import { AuctionsService } from './auctions.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuctionStatus, ListingCategory } from '@prisma/client';

@Controller('api/v1/auctions')
export class AuctionsController {
  constructor(private readonly auctionsService: AuctionsService) {}

  @Get()
  async getAuctions(
    @Query('status') status?: AuctionStatus,
    @Query('category') category?: ListingCategory,
    @Query('sort') sort?: 'endingSoon' | 'highestBid' | 'newest' | 'mostBids',
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.auctionsService.findAll({
      status,
      category,
      sort,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 12,
    });
  }

  @Get(':id')
  async getAuction(@Param('id') id: string) {
    return this.auctionsService.findOne(id);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/watchlist')
  async toggleWatchlist(
    @CurrentUser('id') userId: string,
    @Param('id') auctionId: string,
  ) {
    return this.auctionsService.toggleWatchlist(userId, auctionId);
  }
}
