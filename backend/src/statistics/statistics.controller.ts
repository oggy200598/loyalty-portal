import { Controller, Get, UseGuards } from '@nestjs/common';
import { StatisticsService } from './statistics.service';
import { SellerStatsService } from './seller-stats.service';
import { JwtAuthGuard, RolesGuard } from '../auth/auth.guards';
import { Roles, CurrentUser } from '../auth/auth.decorators';

@Controller()
export class StatisticsController {
  constructor(
    private readonly statisticsService: StatisticsService,
    private readonly sellerStatsService: SellerStatsService,
  ) {}

  @Get('statistics/overview')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  getOverview() {
    return this.statisticsService.getOverview();
  }

  @Get('seller/stats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SELLER', 'ADMIN')
  getStats(@CurrentUser() user: { id: string }) {
    return this.sellerStatsService.getOverview(user.id);
  }

  @Get('seller/products')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SELLER', 'ADMIN')
  getMyProducts(@CurrentUser() user: { id: string }) {
    return this.sellerStatsService.getMyProducts(user.id);
  }
}
