import { Booking } from '../entities/booking.entity';
import { BookingStatus } from '../enums/booking-status.enum';
import { Room } from '../../rooms/entities/room.entity';
import { Payment } from '../../payments/entities/payment.entity';
import { PaymentMethod } from '../../payments/enums/payment-method.enum';
import { PaymentStatus } from '../../payments/enums/payment-status.enum';

export class BookingRoomSummaryDto {
  id!: string;
  name!: string;
  roomNumber!: string;
  thumbnailUrl?: string | null;
}

export class BookingUserSummaryDto {
  id!: string;
  fullName!: string | null;
  email!: string;
  phone!: string | null;
}

export class BookingPaymentSummaryDto {
  id!: string;
  bookingId!: string;
  amount!: string;
  method!: PaymentMethod;
  status!: PaymentStatus;
  transactionId!: string | null;
  paidAt!: Date | null;
  createdAt!: Date;
}

export function pickLatestPayment(
  payments?: Payment[] | null,
): Payment | undefined {
  if (!payments || payments.length === 0) return undefined;
  return [...payments].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  )[0];
}

export class BookingResponseDto {
  id!: string;
  status!: BookingStatus;
  checkInDate!: string;
  checkOutDate!: string;
  pricePerNight!: string;
  totalPrice!: string;
  note!: string | null;
  cancelReason!: string | null;
  createdAt?: Date;
  room?: BookingRoomSummaryDto;
  user?: BookingUserSummaryDto;
  payment?: BookingPaymentSummaryDto;

  constructor(
    booking: Booking,
    extra?: { room?: Room; payment?: Payment | null },
  ) {
    this.id = booking.id;
    this.status = booking.status;
    this.checkInDate = booking.checkInDate;
    this.checkOutDate = booking.checkOutDate;
    this.pricePerNight = booking.pricePerNight.toString();
    this.totalPrice = booking.totalPrice.toString();
    this.note = booking.note ?? null;
    this.cancelReason = booking.cancelReason ?? null;
    this.createdAt = booking.createdAt;

    const room = booking.room ?? extra?.room;
    if (room) {
      this.room = {
        id: room.id,
        name: room.name,
        roomNumber: room.roomNumber,
        thumbnailUrl:
          room.images?.find((image) => image.isThumbnail)?.imageUrl ?? null,
      };
    }

    if (booking.user) {
      this.user = {
        id: booking.user.id,
        fullName: booking.user.fullName ?? null,
        email: booking.user.email,
        phone: booking.user.phone,
      };
    }

    const payment =
      extra && 'payment' in extra
        ? extra.payment
        : pickLatestPayment(booking.payments);
    if (payment) {
      this.payment = {
        id: payment.id,
        bookingId: payment.bookingId,
        amount: payment.amount,
        method: payment.method,
        status: payment.status,
        transactionId: payment.transactionId,
        paidAt: payment.paidAt,
        createdAt: payment.createdAt,
      };
    }
  }
}
