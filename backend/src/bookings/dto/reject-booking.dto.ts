import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class RejectBookingDto {
  @ApiProperty({
    description: 'Lý do admin từ chối yêu cầu đặt phòng',
    example: 'Phòng đang bảo trì trong khoảng thời gian này',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  cancelReason?: string;
}
