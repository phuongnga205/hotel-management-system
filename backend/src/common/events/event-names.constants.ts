// Tên các sự kiện nội bộ (EventEmitter2), dùng thay cho magic string khi
// emit/listen. Mỗi entry khớp 1:1 với 1 class event trong thư mục này.
export enum AppEvent {
  USER_REGISTERED = 'user.registered',
  PASSWORD_RESET_REQUESTED = 'password.reset-requested',
  PASSWORD_CHANGED = 'password.changed',
  BOOKING_STATUS_CHANGED = 'booking.status-changed',
  REVIEW_DELETED = 'review.deleted',
}
