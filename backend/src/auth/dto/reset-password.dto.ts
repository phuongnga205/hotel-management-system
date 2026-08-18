import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsNumberString,
  IsString,
  Length,
  MinLength,
} from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';
import { OTP_LENGTH } from '../auth.constants';

export class ResetPasswordDto {
  @ApiProperty({ example: 'nguyen@gmail.com' })
  @IsEmail(
    {},
    { message: i18nValidationMessage('messages.VALIDATION.IS_EMAIL') },
  )
  @IsNotEmpty({
    message: i18nValidationMessage('messages.VALIDATION.NOT_EMPTY'),
  })
  email!: string;

  @ApiProperty({
    example: '123456',
    description: 'Mã OTP đặt lại mật khẩu gửi qua email',
  })
  @IsNumberString(
    {},
    { message: i18nValidationMessage('messages.VALIDATION.IS_STRING') },
  )
  @Length(OTP_LENGTH, OTP_LENGTH, {
    message: i18nValidationMessage('messages.VALIDATION.OTP_LENGTH'),
  })
  otp!: string;

  @ApiProperty({
    example: '123456',
    description: 'Mật khẩu mới, tối thiểu 6 ký tự',
  })
  @IsString({
    message: i18nValidationMessage('messages.VALIDATION.IS_STRING'),
  })
  @IsNotEmpty({
    message: i18nValidationMessage('messages.VALIDATION.NOT_EMPTY'),
  })
  @MinLength(6, {
    message: i18nValidationMessage('messages.VALIDATION.MIN_LENGTH'),
  })
  newPassword!: string;
}
