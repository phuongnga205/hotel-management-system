import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';
import { PaymentMethod } from '../../payments/enums/payment-method.enum';

// Không có field `amount`, số tiền lấy từ booking.totalPrice
export class PayBookingDto {
  @ApiProperty({ enum: PaymentMethod, example: PaymentMethod.VNPAY })
  @IsEnum(PaymentMethod, {
    message: i18nValidationMessage('messages.VALIDATION.IS_ENUM'),
  })
  method!: PaymentMethod;
}
