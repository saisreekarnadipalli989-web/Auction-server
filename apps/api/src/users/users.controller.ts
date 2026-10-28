import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('api/v1/users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @UseGuards(JwtAuthGuard)
  @Get('me/bids')
  async getMyBids(@CurrentUser('id') userId: string) {
    return this.usersService.getUserBids(userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me/auctions')
  async getMyAuctions(@CurrentUser('id') sellerId: string) {
    return this.usersService.getUserAuctions(sellerId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me/watchlist')
  async getMyWatchlist(@CurrentUser('id') userId: string) {
    return this.usersService.getUserWatchlist(userId);
  }

  @Get(':id/profile')
  async getProfile(@Param('id') userId: string) {
    return this.usersService.getPublicProfile(userId);
  }
}
