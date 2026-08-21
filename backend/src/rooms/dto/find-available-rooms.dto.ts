import {
  IsOptional,
  IsInt,
  Min,
  Max,
  IsDateString,
  IsNumber,
  IsString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { i18nValidationMessage } from 'nestjs-i18n';
import { ROOM_PAGINATION } from '../constants/room-pagination.constants';

export class FindAvailableRoomsDto {
  @ApiPropertyOptional({
    example: 1,
    default: ROOM_PAGINATION.DEFAULT_PAGE,
    description: 'Số trang (bắt đầu từ 1)',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: i18nValidationMessage('messages.VALIDATION.IS_INT') })
  @Min(1, { message: i18nValidationMessage('messages.VALIDATION.MIN') })
  page: number = ROOM_PAGINATION.DEFAULT_PAGE;

  @ApiPropertyOptional({
    example: 10,
    default: ROOM_PAGINATION.DEFAULT_LIMIT,
    description: `Số bản ghi mỗi trang (tối đa ${ROOM_PAGINATION.MAX_LIMIT})`,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: i18nValidationMessage('messages.VALIDATION.IS_INT') })
  @Min(1, { message: i18nValidationMessage('messages.VALIDATION.MIN') })
  @Max(ROOM_PAGINATION.MAX_LIMIT, {
    message: i18nValidationMessage('messages.VALIDATION.MAX'),
  })
  limit: number = ROOM_PAGINATION.DEFAULT_LIMIT;

  // Bắt buộc — tìm phòng "còn trống" luôn phải gắn với 1 khoảng ngày cụ
  // thể, không có ngày thì không có nghĩa "còn trống". Danh sách phòng
  // không kèm ngày thì dùng GET /rooms (RoomsService.findPublicList()).
  @ApiProperty({
    example: '2026-09-01',
    description: 'Ngày nhận phòng (bắt buộc)',
  })
  @IsDateString(
    {},
    { message: i18nValidationMessage('messages.VALIDATION.IS_DATE_STRING') },
  )
  checkIn!: string;

  @ApiProperty({
    example: '2026-09-05',
    description: 'Ngày trả phòng (bắt buộc, phải sau checkIn)',
  })
  @IsDateString(
    {},
    { message: i18nValidationMessage('messages.VALIDATION.IS_DATE_STRING') },
  )
  checkOut!: string;

  @ApiPropertyOptional({ example: 500000, description: 'Giá thấp nhất/đêm' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber(
    {},
    { message: i18nValidationMessage('messages.VALIDATION.IS_NUMBER') },
  )
  @Min(0, { message: i18nValidationMessage('messages.VALIDATION.MIN') })
  minPrice?: number;

  @ApiPropertyOptional({ example: 2000000, description: 'Giá cao nhất/đêm' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber(
    {},
    { message: i18nValidationMessage('messages.VALIDATION.IS_NUMBER') },
  )
  @Min(0, { message: i18nValidationMessage('messages.VALIDATION.MIN') })
  maxPrice?: number;

  @ApiPropertyOptional({
    example: 'wifi,pool',
    description: 'Danh sách tên tiện nghi, phân tách bởi dấu phẩy',
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.split(',').map((v) => v.trim());
    }
    return value as string[];
  })
  @IsString({
    each: true,
    message: i18nValidationMessage('messages.VALIDATION.IS_STRING'),
  })
  amenities?: string[];
}
