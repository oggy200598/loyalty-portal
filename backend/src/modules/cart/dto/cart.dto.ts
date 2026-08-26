import { IsNumber, IsInt, IsOptional, Min } from 'class-validator';

export class AddCartItemDto {
  @IsNumber()
  productId: number;

  @IsOptional()
  @IsNumber()
  variantId?: number;

  @IsInt()
  @Min(1)
  quantity: number;
}

export class UpdateCartItemDto {
  @IsInt()
  @Min(0)
  quantity: number;
}


