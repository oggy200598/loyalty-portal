import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { RecommendationsService } from './recommendations.service';
import { RiskService } from '../risk/risk.service';
import { CreateRecommendationActionDto } from './dto/recommendation-action.dto';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { RolesGuard } from '../../auth/roles.guard';
import { Roles } from '../../auth/roles.decorator';
import { CurrentUser } from '../../auth/current-user.decorator';

@Controller('recommendations')
@UseGuards(JwtAuthGuard, RolesGuard)
export class RecommendationsController {
  constructor(
    private readonly riskService: RiskService,
    private readonly recommendationsService: RecommendationsService,
  ) {}

  @Get('latest')
  @Roles('ADMIN', 'SELLER', 'BUYER')
  getLatest() {
    return this.riskService.getRecommendationsLatest();
  }

  @Get()
  @Roles('ADMIN', 'SELLER')
  list() {
    return this.recommendationsService.list();
  }

  /** Seller/Admin ghi nhận quyết định xử lý (accept/reject...) */
  @Post(':id/actions')
  @Roles('ADMIN', 'SELLER')
  createAction(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Body() dto: CreateRecommendationActionDto,
  ) {
    return this.recommendationsService.createAction(
      BigInt(id),
      user.id,
      dto.decision,
      dto.note,
    );
  }
}
