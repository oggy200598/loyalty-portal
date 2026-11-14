import { Transform, Type } from 'class-transformer';
import { ProfileDto } from '../users/profile.dto';
import {
  ArrayMaxSize,
  IsArray,
  IsDateString,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class AdminListDto {
  @Type(() => Number) @IsInt() @Min(1) @Max(1000000) page = 1;
  @Type(() => Number) @IsInt() @Min(1) @Max(100) limit = 50;
  @IsOptional() @Transform(trim) @IsString() @MaxLength(100) q?: string;
}
export class ProductsQueryDto extends AdminListDto {
  @IsOptional()
  @IsIn(['ACTIVE', 'OUT_OF_STOCK', 'HIDDEN', 'DELETED'])
  status?: string;
}
export class CategoriesQueryDto extends AdminListDto {
  @IsOptional() @IsIn(['ACTIVE', 'INACTIVE']) status?: string;
}
export class UpdateUserDto extends ProfileDto {
  @IsIn(['ACTIVE', 'SUSPENDED']) status: string;
}
export class CategoryDto {
  @Transform(trim) @IsString() @Matches(/\S/) @MaxLength(255) name: string;
  @Transform(trim) @IsString() @MaxLength(5000) description: string;
  @IsOptional() @Matches(/^[1-9]\d{0,18}$/) parentId?: string | null;
  @IsIn(['ACTIVE', 'INACTIVE']) status: string;
}
export class UpdateCategoryDto extends CategoryDto {
  // Categories have no revision column: compare the original editable values.
  @IsString() @MaxLength(255) originalName: string;
  @IsString() @MaxLength(5000) originalDescription: string;
  @IsOptional() @Matches(/^[1-9]\d{0,18}$/) originalParentId?: string | null;
  @IsIn(['ACTIVE', 'INACTIVE']) originalStatus: string;
}
export class ProductDto {
  @Transform(trim) @IsString() @Matches(/\S/) @MaxLength(255) name: string;
  @Transform(trim) @IsString() @MaxLength(10000) description: string;
  @Matches(/^[1-9]\d{0,18}$/) shopId: string;
  @IsOptional() @Matches(/^[1-9]\d{0,18}$/) categoryId?: string | null;
  @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) @Max(1000000000000) price: number;
  @IsInt() @Min(0) @Max(1000000000) stockQuantity: number;
  @IsIn(['ACTIVE', 'OUT_OF_STOCK', 'HIDDEN']) status: string;
  @ValidateIf(
    (_object, value: unknown) =>
      value !== '' &&
      !/^\/media\/products\/[a-z0-9-]+\.webp$/.test(String(value)),
  )
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  @MaxLength(2000)
  imageUrl: string;
}
export class ProductVariantDto {
  @Matches(/^[1-9]\d{0,18}$/) id: string;
  @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) @Max(1000000000000) price: number;
  @IsInt() @Min(0) @Max(1000000000) stockQuantity: number;
  @IsInt() @Min(0) @Max(1000000000) expectedStockQuantity: number;
}
export class UpdateProductDto extends ProductDto {
  @IsDateString() expectedUpdatedAt: string;
  @IsInt() @Min(0) @Max(1000000000) expectedStockQuantity: number;
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => ProductVariantDto)
  variants: ProductVariantDto[];
}
