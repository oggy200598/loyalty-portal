import { ParseBigIntPipe } from '../common/parse-bigint.pipe';
import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { RiskService } from './risk.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';

@Controller('risk')
export class RiskController {
  constructor(private readonly riskService: RiskService) {}

  @Get('overview')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SELLER')
  getOverview(@CurrentUser() user: { id: string; role: string }) {
    return this.riskService.getOverview(user);
  }

  @Get('latest')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  getLatest() {
    return this.riskService.getLatest();
  }

  /**
   * Risk assessment theo ORDER — seller chỉ xem risk của đơn thuộc shop mình.
   * BUYER không được gọi endpoint này (chỉ ADMIN/SELLER).
   */
  @Get('orders/:orderId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SELLER')
  getRiskForOrder(
    @CurrentUser() user: { id: string; role: string },
    @Param('orderId', ParseBigIntPipe) orderId: bigint,
  ) {
    return this.riskService.getRiskForOrder(user, orderId);
  }

  @Get('recommendations/latest')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SELLER', 'BUYER')
  getRecommendationsLatest(@CurrentUser() user: { id: string; role: string }) {
    return this.riskService.getRecommendationsLatest(user);
  }
}
