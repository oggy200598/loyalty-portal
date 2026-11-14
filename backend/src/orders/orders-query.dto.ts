import { Transform } from 'class-transformer';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { PaginationDto } from '../common/pagination.dto';
export class OrdersQueryDto extends PaginationDto {
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MaxLength(100)
  q?: string;
  @IsOptional()
  @IsIn(['UNPAID', 'PAID', 'REFUNDED', 'PARTIALLY_REFUNDED', 'FAILED'])
  paymentStatus?: string;
}
export class OrderStatusDto {
  @IsIn([
    'CONFIRMED',
    'PROCESSING',
    'SHIPPING',
    'DELIVERED',
    'COMPLETED',
    'CANCELLED',
    'RETURNED',
    'FAILED',
    'NON_RECEIVED',
  ])
  status: string;
  @IsOptional() @IsString() @MaxLength(40) expectedStatus?: string;
}
export class CancelOwnOrderDto {
  @IsIn(['PENDING', 'CONFIRMED']) expectedStatus: string;
}
