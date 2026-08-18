import { Booking } from '../entities/booking.entity';
import { BookingStatus } from '../enums/booking-status.enum';

export class BookingResponseDto {
  id!: string;
  userId!: string;
  roomId!: string;
  checkInDate!: string;
  checkOutDate!: string;
  pricePerNight!: number;
  totalPrice!: number;
  status!: BookingStatus;
  holdExpiresAt?: Date | null;
  note?: string | null;
  cancelReason?: string | null;
  createdAt?: Date;

  constructor(booking: Booking) {
    this.id = booking.id;
    this.userId = booking.userId;
    this.roomId = booking.roomId;
    this.checkInDate = booking.checkInDate;
    this.checkOutDate = booking.checkOutDate;
    this.pricePerNight = booking.pricePerNight;
    this.totalPrice = booking.totalPrice;
    this.status = booking.status;
    this.holdExpiresAt = booking.holdExpiresAt;
    this.note = booking.note;
    this.cancelReason = booking.cancelReason;
    this.createdAt = booking.createdAt;
  }
}
