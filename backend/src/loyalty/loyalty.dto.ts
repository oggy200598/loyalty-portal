import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
  ValidateBy,
} from 'class-validator';

const trimText = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;
const IsPositiveBigInt = () =>
  ValidateBy({
    name: 'positiveBigInt',
    validator: {
      validate: (value: unknown) =>
        typeof value === 'string' &&
        /^[1-9]\d{0,18}$/.test(value) &&
        BigInt(value) <= 9223372036854775807n,
      defaultMessage: () =>
        'Mã định danh phải là số nguyên dương trong phạm vi cho phép.',
    },
  });

export class LoyaltyPageDto {
  @Type(() => Number) @IsInt() @Min(1) @Max(1000000) page = 1;
  @Type(() => Number) @IsInt() @Min(1) @Max(100) limit = 20;
  @IsOptional() @Transform(trimText) @IsString() @MaxLength(150) q?: string;
  @IsOptional()
  @IsIn([
    'ACTIVE',
    'INACTIVE',
    'SUSPENDED',
    'DELETED',
    'OPEN',
    'IN_REVIEW',
    'RESOLVED',
    'REJECTED',
    'PENDING',
    'APPROVED',
  ])
  status?: string;
  @IsOptional() @Matches(/^[A-Z][A-Z0-9_]{0,29}$/) tier?: string;
  @IsOptional()
  @IsIn(['EARN', 'REDEEM', 'ADJUSTMENT', 'EXPIRE', 'REVERSAL'])
  kind?: string;
  @IsOptional() @IsDateString() from?: string;
  @IsOptional() @IsDateString() to?: string;
  @IsOptional() @IsUUID() actorId?: string;
}

export class TierDto {
  @Matches(/^[A-Z][A-Z0-9_]{0,29}$/) code: string;
  @Transform(trimText)
  @IsString()
  @Matches(/\S/)
  @MaxLength(100)
  name: string;
  @IsInt() @Min(0) @Max(Number.MAX_SAFE_INTEGER) minimumSpend: number;
  @IsInt() @Min(1) @Max(100000) multiplierBps: number;
  @IsOptional()
  @Transform(trimText)
  @IsString()
  @MaxLength(500)
  benefits?: string;
}

export class RuleConfigDto {
  @IsInt() @Min(1) @Max(1000000000) spendPerPoint: number;
  @IsInt() @Min(1) @Max(3650) expiryDays: number;
  @IsInt() @Min(1) @Max(3650) tierPeriodDays: number;
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => TierDto)
  tiers: TierDto[];
}

export class CreateRuleDto {
  @Transform(trimText)
  @IsString()
  @Matches(/\S/)
  @MaxLength(150)
  name: string;
  @ValidateNested() @Type(() => RuleConfigDto) config: RuleConfigDto;
  @IsOptional() @IsIn(['DRAFT', 'PUBLISHED']) status?: 'DRAFT' | 'PUBLISHED';
  @IsOptional() @IsDateString() effectiveAt?: string;
}

export class UpdateRuleDto extends CreateRuleDto {
  @Matches(/^[a-f0-9]{64}$/) expectedVersion: string;
}

export class PublishRuleDto {
  @IsDateString() effectiveAt: string;
  @IsOptional() @Matches(/^[a-f0-9]{64}$/) expectedVersion?: string;
}

export class CreateRewardDto {
  @Transform(trimText)
  @IsString()
  @Matches(/\S/)
  @MaxLength(150)
  name: string;
  @IsOptional() @IsString() @MaxLength(1000) description?: string;
  @IsInt() @Min(1) @Max(100000000) pointsCost: number;
  @IsInt() @Min(1) @Max(1000000000) discountValue: number;
  @IsInt() @Min(0) @Max(1000000000) minOrderValue: number;
  @IsInt() @Min(0) @Max(1000000) stock: number;
  @IsInt() @Min(0) @Max(1000000000) minimumTierSpend: number;
  @IsInt() @Min(1) @Max(365) voucherDays: number;
}

export class RewardStatusDto {
  @IsBoolean() active: boolean;
  @Matches(/^[a-f0-9]{64}$/) expectedVersion: string;
}

export class UpdateRewardDto extends CreateRewardDto {
  @Matches(/^[a-f0-9]{64}$/) expectedVersion: string;
}

export class RedeemDto {
  @IsPositiveBigInt() rewardId: string;
  @IsUUID('4') idempotencyKey: string;
}

export class CreateComplaintDto {
  @IsIn(['MISSING_POINTS', 'WRONG_POINTS', 'TIER', 'REDEMPTION', 'OTHER'])
  type: string;
  @Transform(trimText)
  @IsString()
  @MinLength(10)
  @MaxLength(2000)
  message: string;
  @IsOptional() @IsPositiveBigInt() orderId?: string;
}

export class ResolveComplaintDto {
  @IsIn(['IN_REVIEW', 'RESOLVED', 'REJECTED']) status: string;
  @Transform(trimText)
  @IsString()
  @Matches(/\S/)
  @MaxLength(2000)
  response: string;
  @IsDateString() expectedUpdatedAt: string;
}

export class CreateAdjustmentDto {
  @IsUUID() memberId: string;
  @IsInt() @Min(-1000000) @Max(1000000) points: number;
  @Transform(trimText)
  @IsString()
  @MinLength(10)
  @MaxLength(2000)
  reason: string;
  @IsOptional() @IsPositiveBigInt() complaintId?: string;
  @IsUUID('4') idempotencyKey: string;
  @IsOptional() @IsBoolean() applyImmediately?: boolean;
}

export class DecideAdjustmentDto {
  @IsIn(['APPROVED', 'REJECTED']) decision: string;
  @Transform(trimText)
  @IsString()
  @Matches(/\S/)
  @MaxLength(2000)
  note: string;
}

export class ConfirmCodPaymentDto {
  @Transform(trimText)
  @IsString()
  @MinLength(5)
  @MaxLength(500)
  reference: string;
}
