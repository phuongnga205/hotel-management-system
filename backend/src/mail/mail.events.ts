import { BookingStatus } from '../bookings/enums/booking-status.enum';

export const MAIL_EVENT = {
  USER_REGISTERED: 'mail.user.registered',
  PASSWORD_RESET_REQUESTED: 'mail.password-reset.requested',
  BOOKING_STATUS_CHANGED: 'mail.booking.status-changed',
  REVIEW_DELETED: 'mail.review.deleted',
} as const;

export class UserRegisteredEvent {
  constructor(
    public readonly userId: string,
    public readonly email: string,
    public readonly recipientName: string,
    public readonly otp: string,
  ) {}
}

export class PasswordResetRequestedEvent {
  constructor(
    public readonly userId: string,
    public readonly email: string,
    public readonly recipientName: string,
    public readonly otp: string,
  ) {}
}

export class BookingStatusChangedEvent {
  constructor(
    public readonly bookingId: string,
    public readonly status: BookingStatus,
  ) {}
}

export class ReviewDeletedEvent {
  constructor(
    public readonly reviewId: string,
    public readonly userId: string,
  ) {}
}
