import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';
import { BOOKING_PAGINATION } from '../constants/booking.constants';

export class BookingHistoryQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: i18nValidationMessage('messages.VALIDATION.IS_INT') })
  @Min(1, { message: i18nValidationMessage('messages.VALIDATION.MIN') })
  page: number = BOOKING_PAGINATION.DEFAULT_PAGE;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: i18nValidationMessage('messages.VALIDATION.IS_INT') })
  @Min(1, { message: i18nValidationMessage('messages.VALIDATION.MIN') })
  @Max(BOOKING_PAGINATION.MAX_LIMIT, {
    message: i18nValidationMessage('messages.VALIDATION.MAX'),
  })
  limit: number = BOOKING_PAGINATION.DEFAULT_LIMIT;
}
