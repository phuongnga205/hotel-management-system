import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';
import { ROOM_PAGINATION } from '../constants/room-pagination.constants';

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
}
