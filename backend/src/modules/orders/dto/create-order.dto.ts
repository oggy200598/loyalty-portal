import { IsString, IsNumber, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class OrderItemDto {
  @IsNumber()
  productId: number;

  @IsString()
  productName: string;

  @IsString()
  variantName: string;

  @IsString()
  imageUrl: string;

  @IsNumber()
  unitPrice: number;

  @IsNumber()
  quantity: number;
}

class CreateOrderDto {
  @IsString()
  customerName: string;

  @IsString()
  phone: string;

  @IsString()
  address: string;

  @IsString()
  paymentMethod: string;

  @IsNumber()
  subtotal: number;

  @IsNumber()
  discount: number;

  @IsNumber()
  shippingFee: number;

  @IsNumber()
  total: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];
}

export { CreateOrderDto };