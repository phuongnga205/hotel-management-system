import { Payment } from '../entities/payment.entity';
import { PaymentMethod } from '../enums/payment-method.enum';
import { PaymentStatus } from '../enums/payment-status.enum';

export class PaymentBookingSummaryDto {
  id!: string;
  roomName!: string;
  roomNumber!: string;
  checkInDate!: string;
  checkOutDate!: string;
}

// Response cho GET /payments/me — của chính user, không kèm thông tin khách
// (đã biết là chính mình) khác bản Admin (AdminPaymentResponseDto), nhưng
// vẫn kèm tóm tắt booking (phòng + ngày) để phân biệt được giao dịch nào
// ứng với booking nào khi nhìn 1 danh sách phẳng gộp nhiều booking.
export class PaymentResponseDto {
  id!: string;
  bookingId!: string;
  amount!: string;
  method!: PaymentMethod;
  status!: PaymentStatus;
  transactionId!: string | null;
  paidAt!: Date | null;
  createdAt!: Date;
  booking?: PaymentBookingSummaryDto;

  constructor(payment: Payment) {
    this.id = payment.id;
    this.bookingId = payment.bookingId;
    this.amount = payment.amount;
    this.method = payment.method;
    this.status = payment.status;
    this.transactionId = payment.transactionId;
    this.paidAt = payment.paidAt;
    this.createdAt = payment.createdAt;

    const booking = payment.booking;
    if (booking?.room) {
      this.booking = {
        id: booking.id,
        roomName: booking.room.name,
        roomNumber: booking.room.roomNumber,
        checkInDate: booking.checkInDate,
        checkOutDate: booking.checkOutDate,
      };
    }
  }
}
