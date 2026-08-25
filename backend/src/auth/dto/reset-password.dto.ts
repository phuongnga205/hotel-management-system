import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsNumberString,
  IsString,
  Length,
  MinLength,
} from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';

export class ResetPasswordDto {
  @ApiProperty({ example: 'guest@example.com' })
  @IsEmail(
    {},
    { message: i18nValidationMessage('messages.VALIDATION.IS_EMAIL') },
  )
  email!: string;

  @ApiProperty({ example: '123456', minLength: 6, maxLength: 6 })
  @IsNumberString(
    {},
    {
      message: i18nValidationMessage('messages.VALIDATION.IS_NUMBER_STRING'),
    },
  )
  @Length(6, 6, {
    message: i18nValidationMessage('messages.VALIDATION.LENGTH'),
  })
  otp!: string;

  @ApiProperty({ example: 'new-password', minLength: 6 })
  @IsString({
    message: i18nValidationMessage('messages.VALIDATION.IS_STRING'),
  })
  @MinLength(6, {
    message: i18nValidationMessage('messages.VALIDATION.MIN_LENGTH'),
  })
  newPassword!: string;
}
