import { BookingStatus } from '../../bookings/enums/booking-status.enum';

// Emit mỗi khi status của 1 booking thay đổi (user huỷ, admin accept/reject,
// hệ thống tự expire...) — nghe bởi NotificationsListener để báo cho User.
export class BookingStatusChangedEvent {
  constructor(
    public readonly bookingId: string,
    public readonly userId: string,
    public readonly userEmail: string,
    public readonly username: string,
    public readonly oldStatus: BookingStatus,
    public readonly newStatus: BookingStatus,
  ) {}
}
