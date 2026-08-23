import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { BOOKING_REASON_MAX_LENGTH } from '../constants/booking.constants';

export class RejectBookingDto {
  @ApiProperty({
    description: 'Lý do admin từ chối yêu cầu đặt phòng',
    example: 'Phòng đang bảo trì trong khoảng thời gian này',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(BOOKING_REASON_MAX_LENGTH)
  cancelReason?: string;
}
