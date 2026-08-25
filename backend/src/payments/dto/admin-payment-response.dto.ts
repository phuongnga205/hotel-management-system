import { Payment } from '../entities/payment.entity';
import { PaymentMethod } from '../enums/payment-method.enum';
import { PaymentStatus } from '../enums/payment-status.enum';

export class AdminPaymentBookingSummaryDto {
  id!: string;
  guestName!: string | null;
  guestEmail!: string;
  roomName!: string;
  roomNumber!: string;
}

export class AdminPaymentResponseDto {
  id!: string;
  bookingId!: string;
  amount!: string;
  method!: PaymentMethod;
  status!: PaymentStatus;
  transactionId!: string | null;
  paidAt!: Date | null;
  createdAt!: Date;
  booking?: AdminPaymentBookingSummaryDto;

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
    if (booking?.user && booking.room) {
      this.booking = {
        id: booking.id,
        guestName: booking.user.fullName ?? null,
        guestEmail: booking.user.email,
        roomName: booking.room.name,
        roomNumber: booking.room.roomNumber,
      };
    }
  }
}
