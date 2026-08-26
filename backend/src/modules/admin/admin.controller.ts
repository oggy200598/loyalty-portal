import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { RolesGuard } from '../../auth/roles.guard';
import { Roles } from '../../auth/roles.decorator';

/**
 * ADMIN PORTAL API — toàn bộ endpoint chỉ dành cho ADMIN.
 * Seller/Buyer gọi bất kỳ endpoint nào ở đây đều bị 403 bởi RolesGuard.
 */
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('overview')
  getOverview() {
    return this.adminService.getOverview();
  }

  @Get('users')
  listUsers() {
    return this.adminService.listUsers();
  }

  @Get('sellers')
  listSellers() {
    return this.adminService.listSellers();
  }

  @Get('shops')
  listShops() {
    return this.adminService.listShops();
  }

  @Get('audit-logs')
  listAuditLogs(@Query('limit') limit?: string) {
    const parsed = limit ? parseInt(limit, 10) : 50;
    return this.adminService.listAuditLogs(
      Number.isFinite(parsed) ? Math.min(parsed, 200) : 50,
    );
  }

  @Get('models')
  listMlModels() {
    return this.adminService.listMlModels();
  }
}
