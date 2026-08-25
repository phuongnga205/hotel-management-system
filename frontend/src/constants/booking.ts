/**
 * PHẢI khớp chính xác với `BOOKING_HOLD_MINUTES` ở
 * `backend/src/bookings/constants/booking.constants.ts` — response booking
 * (`Booking` type, `api/types.ts`) KHÔNG trả field `holdExpiresAt` (hoàn
 * toàn nội bộ BE, xem `frontend/docs/bridge.md` mục `bookings`), nên FE tự
 * suy ra hạn giữ chỗ = `booking.createdAt + BOOKING_HOLD_MINUTES phút` để
 * hiển thị đồng hồ đếm ngược. Đổi giá trị ở BE thì phải đổi luôn ở đây.
 */
export const BOOKING_HOLD_MINUTES = 10

/** Mốc thời gian (ms epoch) hạn giữ chỗ hết hạn, tính từ lúc tạo booking. */
export function getHoldExpiryMs(createdAt: string): number {
  return new Date(createdAt).getTime() + BOOKING_HOLD_MINUTES * 60 * 1000
}
