import { Transform } from 'class-transformer';
import { IsDateString, IsString, Matches, MaxLength } from 'class-validator';

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
