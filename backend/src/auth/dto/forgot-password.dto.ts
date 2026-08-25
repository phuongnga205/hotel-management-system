import { ApiProperty } from '@nestjs/swagger';
import { IsEmail } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';

export class ForgotPasswordDto {
  @ApiProperty({ example: 'guest@example.com' })
  @IsEmail(
    {},
    { message: i18nValidationMessage('messages.VALIDATION.IS_EMAIL') },
  )
  email!: string;
}
