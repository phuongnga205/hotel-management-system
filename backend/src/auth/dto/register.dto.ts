import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';

export class RegisterDto {
  @ApiProperty({ example: 'nguyen@gmail.com', description: 'Email người dùng' })
  @IsEmail(
    {},
    { message: i18nValidationMessage('messages.VALIDATION.IS_EMAIL') },
  )
  @IsNotEmpty({
    message: i18nValidationMessage('messages.VALIDATION.NOT_EMPTY'),
  })
  email: string;

  @ApiProperty({ example: '123456', description: 'Mật khẩu tối thiểu 6 ký tự' })
  @IsString({
    message: i18nValidationMessage('messages.VALIDATION.IS_STRING'),
  })
  @IsNotEmpty({
    message: i18nValidationMessage('messages.VALIDATION.NOT_EMPTY'),
  })
  @MinLength(6, {
    message: i18nValidationMessage('messages.VALIDATION.MIN_LENGTH'),
  })
  password: string;

  @ApiProperty({ example: 'nguyen_van_a', description: 'Tên đăng nhập' })
  @IsString({
    message: i18nValidationMessage('messages.VALIDATION.IS_STRING'),
  })
  @IsNotEmpty({
    message: i18nValidationMessage('messages.VALIDATION.NOT_EMPTY'),
  })
  username: string;

  @ApiPropertyOptional({ example: '0987654321', description: 'Số điện thoại' })
  @IsOptional()
  @IsString({
    message: i18nValidationMessage('messages.VALIDATION.IS_STRING'),
  })
  phone?: string;
}
