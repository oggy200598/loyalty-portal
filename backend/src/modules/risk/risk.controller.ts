import { Controller, Get, Param } from '@nestjs/common';
import { RiskService } from './risk.service';

@Controller('risk')
export class RiskController {
  constructor(private readonly riskService: RiskService) {}

  @Get('overview')
  getOverview() {
    return this.riskService.getOverview();
  }

  @Get('latest')
  getLatest() {
    return this.riskService.getLatest();
  }

  @Get('latest/:buyerId')
  getLatestByBuyerId(@Param('buyerId') buyerId: string) {
    return this.riskService.getLatestByBuyerId(buyerId);
  }

  @Get('recommendations/latest')
  getRecommendationsLatest() {
    return this.riskService.getRecommendationsLatest();
  }
}
