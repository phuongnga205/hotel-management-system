import axios from 'axios'

/**
 * Rút message hiển thị được (toast/form) từ lỗi gọi API — nguồn dùng chung
 * duy nhất, thay vì mỗi page tự lặp `error.response?.data?.message` với
 * `error: any`. CHỈ dùng để lấy message HIỂN THỊ (fallback theo i18n khi BE
 * không trả `message`, hoặc khi lỗi không phải từ API — mất mạng...) — theo
 * đúng quy ước ở `backend/docs/DANH_SACH_API.md` (mục "Response envelope"):
 * FE không được so khớp chuỗi `message` để phân biệt loại lỗi, việc đó phải
 * dùng `statusCode` — xem `getErrorStatusCode` bên dưới.
 *
 * `message` lỗi validate (400) có thể là `string[]` (nhiều lỗi cùng lúc,
 * theo `ValidationPipe` mặc định của NestJS) — hàm này lấy lỗi đầu tiên,
 * đúng gợi ý "FE hiển thị lỗi đầu tiên" trong docs.
 */
export function getErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    const message = (error.response?.data as { message?: string | string[] } | undefined)?.message
    if (Array.isArray(message)) return message[0] ?? fallback
    if (typeof message === 'string' && message.length > 0) return message
  }
  return fallback
}

/**
 * Rút `statusCode` HTTP từ lỗi gọi API — dùng để rẽ nhánh logic (401, 409
 * race condition khi đặt phòng...), không phải để hiển thị. `undefined` khi
 * lỗi không đến từ 1 response HTTP thật (mất mạng, bị huỷ request...).
 */
export function getErrorStatusCode(error: unknown): number | undefined {
  return axios.isAxiosError(error) ? error.response?.status : undefined
}
