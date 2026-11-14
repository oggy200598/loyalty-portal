import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { ParseBigIntPipe } from '../common/parse-bigint.pipe';
import {
  CreateAdjustmentDto,
  CreateComplaintDto,
  CreateRewardDto,
  CreateRuleDto,
  DecideAdjustmentDto,
  LoyaltyPageDto,
  PublishRuleDto,
  RedeemDto,
  ResolveComplaintDto,
  RewardStatusDto,
  UpdateRewardDto,
  UpdateRuleDto,
} from './loyalty.dto';
import { LoyaltyOrdersService } from './loyalty-orders.service';
import { LoyaltyService } from './loyalty.service';

@Controller('loyalty')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('BUYER')
export class LoyaltyController {
  constructor(private readonly loyalty: LoyaltyService) {}

  @Get('me') summary(@CurrentUser() user: { id: string }) {
    return this.loyalty.summary(user.id);
  }
  @Get('charts') charts(@CurrentUser() user: { id: string }) {
    return this.loyalty.charts(user.id);
  }
  @Post('enroll') enroll(@CurrentUser() user: { id: string }) {
    return this.loyalty.enroll(user.id);
  }
  @Get('transactions') transactions(
    @CurrentUser() user: { id: string },
    @Query() query: LoyaltyPageDto,
  ) {
    return this.loyalty.transactions(user.id, query);
  }
  @Get('rewards') rewards() {
    return this.loyalty.rewards();
  }
  @Post('redemptions') redeem(
    @CurrentUser() user: { id: string },
    @Body() dto: RedeemDto,
  ) {
    return this.loyalty.redeem(
      user.id,
      new ParseBigIntPipe().transform(dto.rewardId),
      dto.idempotencyKey,
    );
  }
  @Get('redemptions') redemptions(
    @CurrentUser() user: { id: string },
    @Query() query: LoyaltyPageDto,
  ) {
    return this.loyalty.redemptions(user.id, query);
  }
  @Post('complaints') createComplaint(
    @CurrentUser() user: { id: string },
    @Body() dto: CreateComplaintDto,
  ) {
    return this.loyalty.createComplaint(user.id, dto);
  }
  @Get('complaints') complaints(
    @CurrentUser() user: { id: string },
    @Query() query: LoyaltyPageDto,
  ) {
    return this.loyalty.complaints(query, user.id);
  }
}

@Controller('admin/loyalty')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminLoyaltyController {
  constructor(
    private readonly loyalty: LoyaltyService,
    private readonly orders: LoyaltyOrdersService,
  ) {}

  @Get('overview') overview() {
    return this.loyalty.charts();
  }
  @Get('members') members(@Query() query: LoyaltyPageDto) {
    return this.loyalty.members(query);
  }
  @Get('members/:id') member(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.loyalty.summary(id);
  }
  @Get('members/:id/transactions') memberTransactions(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Query() query: LoyaltyPageDto,
  ) {
    return this.loyalty.transactions(id, query);
  }
  @Patch('rules/:id') updateRule(
    @CurrentUser() user: { id: string },
    @Param('id', ParseBigIntPipe) id: bigint,
    @Body() dto: UpdateRuleDto,
  ) {
    return this.loyalty.updateRule(id, user.id, dto);
  }
  @Get('rules') rules() {
    return this.loyalty.rules();
  }
  @Post('rules') createRule(
    @CurrentUser() user: { id: string },
    @Body() dto: CreateRuleDto,
  ) {
    return this.loyalty.createRule(user.id, dto);
  }
  @Post('rules/:id/submit') submitRule(
    @CurrentUser() user: { id: string },
    @Param('id', ParseBigIntPipe) id: bigint,
  ) {
    return this.loyalty.submitRule(id, user.id);
  }
  @Post('rules/:id/publish') publishRule(
    @CurrentUser() user: { id: string },
    @Param('id', ParseBigIntPipe) id: bigint,
    @Body() dto: PublishRuleDto,
  ) {
    return this.loyalty.publishRule(
      id,
      user.id,
      dto.effectiveAt,
      dto.expectedVersion,
    );
  }
  @Get('rewards') rewards(@Query() query: LoyaltyPageDto) {
    return this.loyalty.rewards(true, query);
  }
  @Post('rewards') createReward(
    @CurrentUser() user: { id: string },
    @Body() dto: CreateRewardDto,
  ) {
    return this.loyalty.createReward(user.id, dto);
  }
  @Patch('rewards/:id') rewardStatus(
    @CurrentUser() user: { id: string },
    @Param('id', ParseBigIntPipe) id: bigint,
    @Body() dto: RewardStatusDto,
  ) {
    return this.loyalty.rewardStatus(
      id,
      user.id,
      dto.active,
      dto.expectedVersion,
    );
  }
  @Get('rewards/:id') rewardDetails(@Param('id', ParseBigIntPipe) id: bigint) {
    return this.loyalty.rewardDetails(id);
  }
  @Patch('rewards/:id/details') updateReward(
    @CurrentUser() user: { id: string },
    @Param('id', ParseBigIntPipe) id: bigint,
    @Body() dto: UpdateRewardDto,
  ) {
    return this.loyalty.updateReward(id, user.id, dto);
  }
  @Get('complaints') complaints(@Query() query: LoyaltyPageDto) {
    return this.loyalty.complaints(query);
  }
  @Patch('complaints/:id') resolveComplaint(
    @CurrentUser() user: { id: string },
    @Param('id', ParseBigIntPipe) id: bigint,
    @Body() dto: ResolveComplaintDto,
  ) {
    return this.loyalty.resolveComplaint(id, user.id, dto);
  }
  @Get('adjustments') adjustments(@Query() query: LoyaltyPageDto) {
    return this.loyalty.adjustments(query);
  }
  @Post('adjustments') createAdjustment(
    @CurrentUser() user: { id: string },
    @Body() dto: CreateAdjustmentDto,
  ) {
    return this.loyalty.createAdjustment(user.id, dto);
  }
  @Patch('adjustments/:id') decideAdjustment(
    @CurrentUser() user: { id: string },
    @Param('id', ParseBigIntPipe) id: bigint,
    @Body() dto: DecideAdjustmentDto,
  ) {
    return this.loyalty.decideAdjustment(id, user.id, dto);
  }
  @Get('audit') audit(@Query() query: LoyaltyPageDto) {
    return this.loyalty.auditLogs(query);
  }
  @Post('jobs/run') async jobs() {
    return {
      expiry: await this.loyalty.expireDue(),
      orders: await this.orders.reconcile(),
    };
  }
}
