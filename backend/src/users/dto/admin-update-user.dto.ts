import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';
import { UserRole, UserStatus } from '../entities/user.entity';

export class AdminUpdateUserDto {
  @ApiPropertyOptional({
    example: 'john.doe',
    maxLength: 50,
  })
  @IsOptional()
  @IsString({ message: i18nValidationMessage('messages.VALIDATION.IS_STRING') })
  @MaxLength(50, {
    message: i18nValidationMessage('messages.VALIDATION.MAX_LENGTH'),
  })
  username?: string;

  @ApiPropertyOptional({
    example: 'john@example.com',
    maxLength: 255,
  })
  @IsOptional()
  @IsEmail(
    {},
    { message: i18nValidationMessage('messages.VALIDATION.IS_EMAIL') },
  )
  @MaxLength(255, {
    message: i18nValidationMessage('messages.VALIDATION.MAX_LENGTH'),
  })
  email?: string;

  @ApiPropertyOptional({
    example: 'John Doe',
    maxLength: 150,
  })
  @IsOptional()
  @IsString({ message: i18nValidationMessage('messages.VALIDATION.IS_STRING') })
  @MaxLength(150, {
    message: i18nValidationMessage('messages.VALIDATION.MAX_LENGTH'),
  })
  fullName?: string;

  @ApiPropertyOptional({
    example: '0912345678',
    maxLength: 20,
  })
  @IsOptional()
  @IsString({ message: i18nValidationMessage('messages.VALIDATION.IS_STRING') })
  @MaxLength(20, {
    message: i18nValidationMessage('messages.VALIDATION.MAX_LENGTH'),
  })
  @Matches(/^(0|\+84)\d{9,10}$/, {
    message: i18nValidationMessage('messages.VALIDATION.INVALID_PHONE'),
  })
  phone?: string;

  @ApiPropertyOptional({
    enum: UserRole,
    example: UserRole.USER,
  })
  @IsOptional()
  @IsEnum(UserRole, {
    message: i18nValidationMessage('messages.VALIDATION.IS_ENUM'),
  })
  role?: UserRole;

  @ApiPropertyOptional({
    enum: UserStatus,
    example: UserStatus.ACTIVE,
  })
  @IsOptional()
  @IsEnum(UserStatus, {
    message: i18nValidationMessage('messages.VALIDATION.IS_ENUM'),
  })
  status?: UserStatus;
}
