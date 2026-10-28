import { Controller, Get, Post, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ListingsService, CreateListingInput } from './listings.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole, ListingCategory, ListingCondition, AuctionStatus } from '@prisma/client';

@Controller('api/v1/listings')
export class ListingsController {
  constructor(private readonly listingsService: ListingsService) {}

  @Get()
  async getListings(
    @Query('search') search?: string,
    @Query('category') category?: ListingCategory,
    @Query('condition') condition?: ListingCondition,
    @Query('status') status?: AuctionStatus,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.listingsService.findAll({
      search,
      category,
      condition,
      status,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 12,
    });
  }

  @Get(':id')
  async getListing(@Param('id') id: string) {
    return this.listingsService.findOne(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SELLER, UserRole.ADMIN)
  @Post()
  async createListing(
    @CurrentUser('id') sellerId: string,
    @Body() dto: CreateListingInput,
  ) {
    return this.listingsService.createListing(sellerId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  async deleteListing(
    @Param('id') id: string,
    @CurrentUser() user: { id: string; role: UserRole },
  ) {
    return this.listingsService.deleteListing(id, user.id, user.role === UserRole.ADMIN);
  }
}
