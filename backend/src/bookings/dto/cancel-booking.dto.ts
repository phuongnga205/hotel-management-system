import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';

const CANCEL_REASON_MAX_LENGTH = 500;

export class CancelBookingDto {
  @ApiProperty({ example: 'Đổi lịch trình cá nhân' })
  @IsString({
    message: i18nValidationMessage('messages.VALIDATION.IS_STRING'),
  })
  @IsNotEmpty({
    message: i18nValidationMessage('messages.VALIDATION.NOT_EMPTY'),
  })
  @MaxLength(CANCEL_REASON_MAX_LENGTH)
  reason!: string;
}
