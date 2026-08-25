import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';
import { BOOKING_PAGINATION } from '../constants/booking.constants';
import { BookingStatus } from '../enums/booking-status.enum';

export class BookingHistoryQueryDto {
  // Loc theo tab trang thai o BookingHistoryPage (FE) - truoc day thieu field
  // nay nen query.status bi ValidationPipe (whitelist:true) am tham strip,
  // khien moi tab tra ve y het toan bo booking cua user (tab "loc" khong lam gi).
  @IsOptional()
  @IsEnum(BookingStatus, {
    message: i18nValidationMessage('messages.VALIDATION.IS_ENUM'),
  })
  status?: BookingStatus;

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
