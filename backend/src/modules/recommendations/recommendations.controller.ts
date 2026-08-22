import { Controller, Get } from '@nestjs/common';
import { RiskService } from '../risk/risk.service';

@Controller('recommendations')
export class RecommendationsController {
  constructor(private readonly riskService: RiskService) {}

  @Get('latest')
  getLatest() {
    return this.riskService.getRecommendationsLatest();
  }
}
