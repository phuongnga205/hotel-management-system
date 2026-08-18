/**
 * HTTP status codes dùng để so sánh trong logic (interceptor, error handling...).
 * Không gõ cứng số 401/403/... rải rác — luôn tham chiếu qua đây.
 */
export const HTTP_STATUS = {
  UNAUTHORIZED: 401,
} as const

/**
 * Tên custom header dùng để báo ngôn ngữ hiện tại cho Backend.
 * Phải khớp với HeaderResolver(['x-lang']) trong I18nModule của NestJS.
 */
export const LANG_HEADER = 'x-lang'
