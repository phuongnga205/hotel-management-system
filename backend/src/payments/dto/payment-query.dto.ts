import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';
import { PaymentMethod } from '../enums/payment-method.enum';
import { PaymentStatus } from '../enums/payment-status.enum';
import { PAYMENT_PAGINATION } from '../constants/payment.constants';

// Dùng cho GET /payments/me
export class PaymentQueryDto {
  @ApiPropertyOptional({
    example: 1,
    default: PAYMENT_PAGINATION.DEFAULT_PAGE,
    description: 'Số trang (bắt đầu từ 1)',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: i18nValidationMessage('messages.VALIDATION.IS_INT') })
  @Min(1, { message: i18nValidationMessage('messages.VALIDATION.MIN') })
  page: number = PAYMENT_PAGINATION.DEFAULT_PAGE;

  @ApiPropertyOptional({
    example: 10,
    default: PAYMENT_PAGINATION.DEFAULT_LIMIT,
    description: `Số bản ghi mỗi trang (tối đa ${PAYMENT_PAGINATION.MAX_LIMIT})`,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: i18nValidationMessage('messages.VALIDATION.IS_INT') })
  @Min(1, { message: i18nValidationMessage('messages.VALIDATION.MIN') })
  @Max(PAYMENT_PAGINATION.MAX_LIMIT, {
    message: i18nValidationMessage('messages.VALIDATION.MAX'),
  })
  limit: number = PAYMENT_PAGINATION.DEFAULT_LIMIT;

  @ApiPropertyOptional({
    enum: PaymentStatus,
    description: 'Lọc theo trạng thái thanh toán',
  })
  @IsOptional()
  @IsEnum(PaymentStatus, {
    message: i18nValidationMessage('messages.VALIDATION.IS_ENUM'),
  })
  status?: PaymentStatus;

  @ApiPropertyOptional({
    enum: PaymentMethod,
    description: 'Lọc theo phương thức thanh toán',
  })
  @IsOptional()
  @IsEnum(PaymentMethod, {
    message: i18nValidationMessage('messages.VALIDATION.IS_ENUM'),
  })
  method?: PaymentMethod;
}
