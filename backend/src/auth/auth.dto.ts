import {
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  Matches,
} from 'class-validator';

export class LoginDto {
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  email: string;

  @IsString()
  @MinLength(1)
  @MaxLength(72)
  password: string;
}

export class RegisterDto extends LoginDto {
  @IsEmail()
  declare email: string;

  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name: string;

  @MinLength(8)
  declare password: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @IsOptional()
  @IsIn(['BUYER'])
  role?: 'BUYER';
}

export class ForgotPasswordDto {
  @IsEmail()
  @MaxLength(255)
  email: string;
}

export class NewPasswordDto {
  @IsString() @MinLength(8) @MaxLength(72) password: string;
}
export class ResetPasswordDto extends NewPasswordDto {
  @IsString() @Matches(/^[a-f0-9]{64}$/) token: string;
}
export class ChangePasswordDto extends NewPasswordDto {
  @IsString() @MinLength(1) @MaxLength(72) currentPassword: string;
}
