import { Controller, Get, Patch, Post, Param, Body, UseGuards } from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('api/v1/admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('users')
  async getAllUsers() {
    return this.adminService.getAllUsers();
  }

  @Patch('users/:id/suspend')
  async setUserSuspension(
    @Param('id') targetUserId: string,
    @Body() body: { isSuspended: boolean; reason: string },
    @CurrentUser('id') adminId: string,
  ) {
    return this.adminService.setUserSuspension(targetUserId, body.isSuspended, adminId, body.reason || 'Admin action');
  }

  @Get('reports')
  async getReports() {
    return this.adminService.getReports();
  }

  @Post('listings/:id/moderate')
  async moderateListing(
    @Param('id') listingId: string,
    @Body() body: { action: 'SUSPEND' | 'APPROVE'; notes: string },
    @CurrentUser('id') adminId: string,
  ) {
    return this.adminService.moderateListing(listingId, body.action, adminId, body.notes);
  }

  @Get('audit-logs')
  async getAuditLogs() {
    return this.adminService.getAuditLogs();
  }
}
