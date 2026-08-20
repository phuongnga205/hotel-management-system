// Cột `bookings.status` là varchar + CHECK, không phải Postgres enum — nên
// dùng type + const object thay vì TS `enum`, khớp đúng bản chất cột DB
// (xem @Check ở booking.entity.ts).
export type BookingStatus =
  'PENDING' | 'ACCEPTED' | 'REJECTED' | 'CANCELLED' | 'EXPIRED';
export const BookingStatus = {
  PENDING: 'PENDING',
  ACCEPTED: 'ACCEPTED',
  REJECTED: 'REJECTED',
  CANCELLED: 'CANCELLED',
  EXPIRED: 'EXPIRED',
} as const satisfies Record<string, BookingStatus>;
