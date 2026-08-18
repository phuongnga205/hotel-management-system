/**
 * Nơi duy nhất đọc và validate biến môi trường (import.meta.env).
 * Các file logic khác (axiosClient, ...) phải import từ đây, không được
 * gọi thẳng import.meta.env.XXX rải rác — tương tự việc bắt buộc dùng
 * ConfigService thay vì process.env trực tiếp ở backend NestJS.
 */

function requireEnv(key: string, value: string | undefined): string {
  if (!value) {
    throw new Error(
      `Thiếu cấu hình ${key}. Hãy tạo file .env (dựa theo .env.example) và khai báo biến này.`,
    )
  }
  return value
}

export const env = {
  apiBaseUrl: requireEnv('VITE_API_BASE_URL', import.meta.env.VITE_API_BASE_URL),
} as const
