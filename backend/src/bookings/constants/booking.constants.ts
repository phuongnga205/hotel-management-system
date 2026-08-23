// Số phút giữ chỗ (hold) kể từ lúc tạo booking tới khi phải được giải quyết
// (thanh toán hoặc admin accept/reject), quá hạn thì cron tự chuyển EXPIRED
// để nhả chỗ cho người khác — chống race condition giữ phòng vô thời hạn.
export const BOOKING_HOLD_MINUTES = 10;

// Dùng để quy đổi phút -> mili-giây khi tính hạn giữ chỗ (buildHoldExpiry).
export const MINUTE_IN_MS = 60 * 1000;

// Dùng để quy đổi số ngày ở lại từ khoảng chênh lệch mili-giây giữa 2 mốc
// ngày, thay cho hardcode `1000 * 60 * 60 * 24`.
export const MS_PER_DAY = 1000 * 60 * 60 * 24;

export const BOOKING_PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 10,
  MAX_LIMIT: 100,
} as const;
