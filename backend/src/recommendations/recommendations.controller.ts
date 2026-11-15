import { ParseBigIntPipe } from '../common/parse-bigint.pipe';
import { Controller, Get, Post, Param, Body, UseGuards } from '@nestjs/common';
import { RecommendationsService } from './recommendations.service';
import { RiskService } from '../risk/risk.service';
import { CreateRecommendationActionDto } from './recommendation-action.dto';
import { JwtAuthGuard, RolesGuard } from '../auth/auth.guards';
import { Roles, CurrentUser } from '../auth/auth.decorators';

@Controller('recommendations')
@UseGuards(JwtAuthGuard, RolesGuard)
export class RecommendationsController {
  constructor(
    private readonly riskService: RiskService,
    private readonly recommendationsService: RecommendationsService,
  ) {}

  @Get('latest')
  @Roles('ADMIN', 'SELLER', 'BUYER')
  getLatest(@CurrentUser() user: { id: string; role: string }) {
    return this.riskService.getRecommendationsLatest(user);
  }

  @Get()
  @Roles('ADMIN', 'SELLER')
  list(@CurrentUser() user: { id: string; role: string }) {
    return this.recommendationsService.list(user);
  }

  /** Seller/Admin ghi nhận quyết định xử lý (accept/reject...) */
  @Post(':id/actions')
  @Roles('ADMIN', 'SELLER')
  createAction(
    @CurrentUser() user: { id: string; role: string },
    @Param('id', ParseBigIntPipe) id: bigint,
    @Body() dto: CreateRecommendationActionDto,
  ) {
    return this.recommendationsService.createAction(
      id,
      user,
      dto.decision,
      dto.note,
    );
  }
}
