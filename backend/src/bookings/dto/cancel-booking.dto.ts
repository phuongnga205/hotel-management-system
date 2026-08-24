import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { BOOKING_REASON_MAX_LENGTH } from '../constants/booking.constants';

export class CancelBookingDto {
  @ApiProperty({
    description: 'Booking request cancel reason',
    example: 'meeting cancelled',
  })
  @IsOptional()
  @IsString()
  @MaxLength(BOOKING_REASON_MAX_LENGTH)
  cancelReason?: string;
}
