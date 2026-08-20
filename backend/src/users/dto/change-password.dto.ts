import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';

export class ChangePasswordDto {
  @ApiProperty({ example: '123456', description: 'Mật khẩu hiện tại' })
  @IsString({ message: i18nValidationMessage('messages.VALIDATION.IS_STRING') })
  @IsNotEmpty({
    message: i18nValidationMessage('messages.VALIDATION.NOT_EMPTY'),
  })
  @MinLength(6, {
    message: i18nValidationMessage('messages.VALIDATION.MIN_LENGTH'),
  })
  currentPassword!: string;

  @ApiProperty({ example: '1234567', description: 'Mật khẩu mới' })
  @IsString({ message: i18nValidationMessage('messages.VALIDATION.IS_STRING') })
  @IsNotEmpty({
    message: i18nValidationMessage('messages.VALIDATION.NOT_EMPTY'),
  })
  @MinLength(6, {
    message: i18nValidationMessage('messages.VALIDATION.MIN_LENGTH'),
  })
  newPassword!: string;
}
