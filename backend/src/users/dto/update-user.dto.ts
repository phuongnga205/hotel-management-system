import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';

export class UpdateUserDto {
  @ApiPropertyOptional({ example: 'nguyen@gmail.com', description: 'Email' })
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
    example: 'nguyen_van_a',
    description: 'Tên đăng nhập',
  })
  @IsOptional()
  @IsString({ message: i18nValidationMessage('messages.VALIDATION.IS_STRING') })
  @MaxLength(50, {
    message: i18nValidationMessage('messages.VALIDATION.MAX_LENGTH'),
  })
  username?: string;

  @ApiPropertyOptional({
    example: 'Nguyễn Văn A',
    description: 'Họ và tên đầy đủ',
  })
  @IsOptional()
  @IsString({ message: i18nValidationMessage('messages.VALIDATION.IS_STRING') })
  @MaxLength(150, {
    message: i18nValidationMessage('messages.VALIDATION.MAX_LENGTH'),
  })
  fullName?: string;

  @ApiPropertyOptional({ example: '0987654321', description: 'Số điện thoại' })
  @IsOptional()
  @IsString({ message: i18nValidationMessage('messages.VALIDATION.IS_STRING') })
  @MaxLength(20, {
    message: i18nValidationMessage('messages.VALIDATION.MAX_LENGTH'),
  })
  @Matches(/^(0|\+84)\d{9,10}$/, {
    message: i18nValidationMessage('messages.VALIDATION.INVALID_PHONE'),
  })
  phone?: string;
}
