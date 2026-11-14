import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsNumber,
  Max,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class OrderItemDto {
  @IsInt()
  @Min(1)
  @Max(Number.MAX_SAFE_INTEGER)
  productId: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(Number.MAX_SAFE_INTEGER)
  variantId?: number;

  @IsInt()
  @Min(1)
  @Max(1000000)
  quantity: number;
}

export class QuoteOrderDto {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  couponCode?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];
}

export class CreateOrderDto extends QuoteOrderDto {
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  expectedTotal?: number;

  @IsString()
  @Matches(/\S/)
  @MaxLength(255)
  customerName: string;

  @IsString()
  @Matches(/^0\d{9}$/)
  phone: string;

  @IsString()
  @Matches(/\S/)
  @MaxLength(1000)
  address: string;

  @IsIn(['COD', 'MOMO', 'BANK', 'BANK_TRANSFER', 'CREDIT_CARD'])
  paymentMethod: string;
}
