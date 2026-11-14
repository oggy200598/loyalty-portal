import { IsInt, IsOptional, Min, Max } from 'class-validator';

export class AddCartItemDto {
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

export class UpdateCartItemDto {
  @IsInt()
  @Min(0)
  @Max(1000000)
  quantity: number;
}
