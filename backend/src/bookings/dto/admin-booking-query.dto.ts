import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';
import { BookingStatus } from '../enums/booking-status.enum';
import {
  BOOKING_PAGINATION,
  BOOKING_SEARCH_MAX_LENGTH,
} from '../constants/booking.constants';

// Dùng cho GET /admin/bookings
export class AdminBookingQueryDto {
  @ApiPropertyOptional({
    example: 1,
    default: BOOKING_PAGINATION.DEFAULT_PAGE,
    description: 'Số trang (bắt đầu từ 1)',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: i18nValidationMessage('messages.VALIDATION.IS_INT') })
  @Min(1, { message: i18nValidationMessage('messages.VALIDATION.MIN') })
  page: number = BOOKING_PAGINATION.DEFAULT_PAGE;

  @ApiPropertyOptional({
    example: 10,
    default: BOOKING_PAGINATION.DEFAULT_LIMIT,
    description: `Số bản ghi mỗi trang (tối đa ${BOOKING_PAGINATION.MAX_LIMIT})`,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: i18nValidationMessage('messages.VALIDATION.IS_INT') })
  @Min(1, { message: i18nValidationMessage('messages.VALIDATION.MIN') })
  @Max(BOOKING_PAGINATION.MAX_LIMIT, {
    message: i18nValidationMessage('messages.VALIDATION.MAX'),
  })
  limit: number = BOOKING_PAGINATION.DEFAULT_LIMIT;

  @ApiPropertyOptional({
    enum: BookingStatus,
    description: 'Lọc theo trạng thái booking',
  })
  @IsOptional()
  @IsEnum(BookingStatus, {
    message: i18nValidationMessage('messages.VALIDATION.IS_ENUM'),
  })
  status?: BookingStatus;

  @ApiPropertyOptional({
    description: 'Tìm theo tên/email khách hoặc mã booking',
  })
  @IsOptional()
  @IsString({ message: i18nValidationMessage('messages.VALIDATION.IS_STRING') })
  @MaxLength(BOOKING_SEARCH_MAX_LENGTH, {
    message: i18nValidationMessage('messages.VALIDATION.MAX_LENGTH'),
  })
  search?: string;
}
