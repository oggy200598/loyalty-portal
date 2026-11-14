import { Transform } from 'class-transformer';
import { IsInt, IsString, Matches, Max, MaxLength, Min } from 'class-validator';
const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;
export class SettingsDto {
  @Transform(trim) @IsString() @Matches(/\S/) @MaxLength(150) storeName: string;
  @Transform(trim)
  @IsString()
  @MaxLength(255)
  @Matches(/^$|^[^\s@]+@[^\s@]+\.[^\s@]+$/)
  supportEmail: string;
  @Transform(trim)
  @IsString()
  @MaxLength(20)
  @Matches(/^[+0-9 ()-]*$/)
  supportPhone: string;
  @Transform(trim) @IsString() @MaxLength(500) storeAddress: string;
  @IsInt() @Min(0) @Max(10000000) shippingFee: number;
  @IsInt() @Min(0) @Max(1000000000) freeShippingThreshold: number;
  @IsInt() @Min(1) expectedVersion: number;
}
