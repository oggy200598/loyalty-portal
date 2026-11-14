import { Transform } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsInt,
  IsNumber,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';

export class CouponDetailsDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @Matches(/\S/)
  @MaxLength(255)
  name: string;
  @IsIn(['FIXED', 'PERCENT', 'FREE_SHIP']) discountType: string;
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(999999999999)
  discountValue: number;
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(999999999999)
  minOrderValue: number;
  @ValidateIf((_object, value: unknown) => value !== null)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(999999999999)
  maxDiscount: number | null;
  @ValidateIf((_object, value: unknown) => value !== null)
  @IsInt()
  @Min(1)
  @Max(2147483647)
  usageLimit: number | null;
  @IsDateString() startAt: string;
  @IsDateString() endAt: string;
  @IsIn(['ACTIVE', 'INACTIVE', 'EXPIRED']) status: string;
}

export class CreateCouponDto extends CouponDetailsDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  @IsString()
  @Matches(/^[A-Z0-9][A-Z0-9_-]{0,49}$/, {
    message:
      'Mã giảm giá gồm 1–50 chữ cái không dấu, số, dấu gạch ngang hoặc gạch dưới.',
  })
  code: string;
}

export class UpdateCouponDto extends CouponDetailsDto {
  @Matches(/^[a-f0-9]{64}$/) expectedVersion: string;
}
