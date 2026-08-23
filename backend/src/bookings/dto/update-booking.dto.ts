import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';
import { IsDateOnly } from '../../common/validators/is-date-only.validator';
import { BOOKING_NOTE_MAX_LENGTH } from '../constants/booking.constants';

// Không có field nào bắt buộc (sửa 1 phần), nhưng service.update() từ chối
// payload rỗng (không field nào được truyền) ngay trước khi đụng tới DB —
// xem BookingsService.update().
export class UpdateBookingDto {
  @ApiProperty({
    description: 'The check-in date (YYYY-MM-DD, no time/timezone part)',
    example: '2023-10-01',
  })
  @IsOptional()
  @IsDateOnly({
    message: i18nValidationMessage('messages.VALIDATION.IS_DATE_STRING'),
  })
  checkInDate?: string;

  @ApiProperty({
    description: 'The check-out date (YYYY-MM-DD, no time/timezone part)',
    example: '2023-10-05',
  })
  @IsOptional()
  @IsDateOnly({
    message: i18nValidationMessage('messages.VALIDATION.IS_DATE_STRING'),
  })
  checkOutDate?: string;

  @ApiProperty({
    description: 'A note about the booking',
    example: 'Special requests: extra towels',
  })
  @IsOptional()
  @IsString()
  @MaxLength(BOOKING_NOTE_MAX_LENGTH)
  note?: string;
}
