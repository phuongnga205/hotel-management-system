import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';
import { RoomStatus } from '../enums/room-status.enum';
import { SortOrder } from '../../common/enums/sort-order.enum';
import { ROOM_PAGINATION } from '../constants/room-pagination.constants';

// Cot dung de sap xep, ngoai "createdAt" (mac dinh, moi nhat truoc) - "price"/
// "capacity" phuc vu nut sap xep tang/giam rieng cho 2 cot do o AdminRoomListPage.
export const ROOM_SORT_BY_VALUES = ['createdAt', 'price', 'capacity'] as const;
export type RoomSortBy = (typeof ROOM_SORT_BY_VALUES)[number];

// Dùng cho GET /admin/rooms
export class ListRoomsDto {
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

  @ApiPropertyOptional({
    enum: RoomStatus,
    description: 'Lọc theo trạng thái phòng (chỉ Admin mới xem được)',
  })
  @IsOptional()
  @IsEnum(RoomStatus, {
    message: i18nValidationMessage('messages.VALIDATION.IS_ENUM'),
  })
  status?: RoomStatus;

  @ApiPropertyOptional({
    description: 'Tìm theo số phòng / tên phòng / loại phòng (khớp gần đúng)',
    example: 'Deluxe',
  })
  @IsOptional()
  @IsString({ message: i18nValidationMessage('messages.VALIDATION.IS_STRING') })
  @MaxLength(100, {
    message: i18nValidationMessage('messages.VALIDATION.MAX_LENGTH'),
  })
  search?: string;

  @ApiPropertyOptional({
    description:
      'Lọc riêng theo loại phòng (khớp gần đúng) - khác `search` (search gộp cả roomNumber/name/roomType)',
    example: 'Deluxe',
  })
  @IsOptional()
  @IsString({ message: i18nValidationMessage('messages.VALIDATION.IS_STRING') })
  @MaxLength(50, {
    message: i18nValidationMessage('messages.VALIDATION.MAX_LENGTH'),
  })
  roomType?: string;

  @ApiPropertyOptional({
    enum: SortOrder,
    default: SortOrder.DESC,
    description: 'Chiều sắp xếp (mặc định mới nhất/giá trị lớn nhất trước)',
  })
  @IsOptional()
  @IsEnum(SortOrder, {
    message: i18nValidationMessage('messages.VALIDATION.IS_ENUM'),
  })
  sortOrder?: SortOrder = SortOrder.DESC;

  @ApiPropertyOptional({
    enum: ROOM_SORT_BY_VALUES,
    default: 'createdAt',
    description:
      'Cột dùng để sắp xếp - mặc định thời gian tạo, có thể đổi sang giá/sức chứa',
  })
  @IsOptional()
  @IsIn(ROOM_SORT_BY_VALUES, {
    message: i18nValidationMessage('messages.VALIDATION.IS_ENUM'),
  })
  sortBy?: RoomSortBy = 'createdAt';
}
