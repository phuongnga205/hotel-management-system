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
  // Bật/tắt lớp mock cho các API chưa nối data thật (xem `src/api/mocks/`).
  // Mặc định `true` — hiện chưa insert data thật/BE chưa xong hết endpoint.
  // Khi sẵn sàng nối thật, set `VITE_USE_MOCK=false` trong `.env`, không cần
  // sửa code ở page hay ở lớp `api/*.api.ts`.
  useMock: import.meta.env.VITE_USE_MOCK !== 'false',
} as const
