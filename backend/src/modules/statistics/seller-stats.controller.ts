import { Controller, Get, UseGuards } from '@nestjs/common';
import { SellerStatsService } from './seller-stats.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { RolesGuard } from '../../auth/roles.guard';
import { Roles } from '../../auth/roles.decorator';
import { CurrentUser } from '../../auth/current-user.decorator';

@Controller('seller')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SellerStatsController {
  constructor(private readonly sellerStatsService: SellerStatsService) {}

  /** Seller Dashboard KPI — chỉ tính trên shop của seller hiện tại. */
  @Get('stats')
  @Roles('SELLER', 'ADMIN')
  getStats(@CurrentUser() user: { id: string }) {
    return this.sellerStatsService.getOverview(user.id);
  }

  /** Sản phẩm của shop seller — ownership từ DB. */
  @Get('products')
  @Roles('SELLER', 'ADMIN')
  getMyProducts(@CurrentUser() user: { id: string }) {
    return this.sellerStatsService.getMyProducts(user.id);
  }
}
