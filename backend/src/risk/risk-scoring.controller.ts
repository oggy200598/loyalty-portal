import {
  Controller,
  Post,
  Param,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import { RiskScoringService } from './risk-scoring.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('risk')
@UseGuards(JwtAuthGuard, RolesGuard)
export class RiskScoringController {
  constructor(private readonly scoringService: RiskScoringService) {}

  /** Chấm điểm rủi ro cho một buyer (real-time, heuristic model) */
  @Post('score/:buyerId')
  @Roles('ADMIN')
  scoreBuyer(@Param('buyerId', new ParseUUIDPipe()) buyerId: string) {
    return this.scoringService.scoreBuyer(buyerId);
  }
}
