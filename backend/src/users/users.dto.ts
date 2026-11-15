import { Transform, Type } from 'class-transformer';
import {
  IsDateString,
  IsString,
  Matches,
  MaxLength,
  IsBoolean,
  IsInt,
  Min,
} from 'class-validator';

export class ProfileDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @Matches(/\S/)
  @MaxLength(255)
  fullName: string;
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MaxLength(20)
  @Matches(/^[+0-9 ()-]*$/)
  phone: string;
  @IsDateString() expectedUpdatedAt: string;
}

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class AddressDto {
  @Transform(trim)
  @IsString()
  @Matches(/\S/)
  @MaxLength(255)
  receiverName: string;
  @Transform(trim) @IsString() @Matches(/^0\d{9}$/) phone: string;
  @Transform(trim) @IsString() @Matches(/\S/) @MaxLength(100) province: string;
  @Transform(trim) @IsString() @MaxLength(100) district: string;
  @Transform(trim) @IsString() @Matches(/\S/) @MaxLength(100) ward: string;
  @Transform(trim)
  @IsString()
  @Matches(/\S/)
  @MaxLength(500)
  addressDetail: string;
  @IsBoolean() isDefault: boolean;
}

export class AddressVersionDto {
  @Type(() => Number) @IsInt() @Min(1) version: number;
}

export class UpdateAddressDto extends AddressDto {
  @IsInt() @Min(1) version: number;
}
