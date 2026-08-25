import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';
import { REVIEW_PAGINATION } from '../reviews.constants';
import { SortOrder } from '../../common/enums/sort-order.enum';

export class ReviewQueryDto {
  @ApiPropertyOptional({
    example: 1,
    default: REVIEW_PAGINATION.DEFAULT_PAGE,
    description: 'Số trang (bắt đầu từ 1)',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: i18nValidationMessage('messages.VALIDATION.IS_INT') })
  @Min(1, { message: i18nValidationMessage('messages.VALIDATION.MIN') })
  page: number = REVIEW_PAGINATION.DEFAULT_PAGE;

  @ApiPropertyOptional({
    example: 10,
    default: REVIEW_PAGINATION.DEFAULT_LIMIT,
    description: `Số bản ghi mỗi trang (tối đa ${REVIEW_PAGINATION.MAX_LIMIT})`,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: i18nValidationMessage('messages.VALIDATION.IS_INT') })
  @Min(1, { message: i18nValidationMessage('messages.VALIDATION.MIN') })
  @Max(REVIEW_PAGINATION.MAX_LIMIT, {
    message: i18nValidationMessage('messages.VALIDATION.MAX'),
  })
  limit: number = REVIEW_PAGINATION.DEFAULT_LIMIT;

  // Chi ap dung o findAll() (GET /admin/reviews) - findAllForUser()/
  // findByRoom() van hardcode DESC nhu cu, khong doi hanh vi 2 endpoint do.
  @ApiPropertyOptional({
    enum: SortOrder,
    default: SortOrder.DESC,
    description:
      'Sắp xếp theo thời gian tạo đánh giá (mặc định mới nhất trước)',
  })
  @IsOptional()
  @IsEnum(SortOrder, {
    message: i18nValidationMessage('messages.VALIDATION.IS_ENUM'),
  })
  sortOrder?: SortOrder = SortOrder.DESC;
}
