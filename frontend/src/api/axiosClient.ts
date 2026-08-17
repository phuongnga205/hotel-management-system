import axios from 'axios'

/**
 * Axios instance dùng chung cho toàn bộ app.
 * Thay vì phải tự tay gắn Authorization header ở từng chỗ gọi API,
 * ta dùng "interceptor" để axios tự động làm việc đó trước mỗi request.
 */
export const axiosClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000',
  headers: {
    'Content-Type': 'application/json',
  },
})

// Key dùng để lưu access token trong localStorage.
// TODO: cân nhắc chuyển sang cookie httpOnly nếu backend hỗ trợ, an toàn hơn localStorage.
const ACCESS_TOKEN_KEY = 'accessToken'

export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_TOKEN_KEY)
}

export function setAccessToken(token: string): void {
  localStorage.setItem(ACCESS_TOKEN_KEY, token)
}

export function clearAccessToken(): void {
  localStorage.removeItem(ACCESS_TOKEN_KEY)
}

// --- REQUEST INTERCEPTOR ---
// Chạy trước mỗi request: chặn request lại, nhét JWT token vào header
// Authorization nếu đã đăng nhập (có token trong localStorage).
axiosClient.interceptors.request.use((config) => {
  const token = getAccessToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// --- RESPONSE INTERCEPTOR ---
// Chạy sau khi nhận response: nếu backend trả 401 (token hết hạn / không hợp lệ),
// tự động xoá token và điều hướng về trang login.
axiosClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      clearAccessToken()
      // TODO: thay bằng cách điều hướng phù hợp với router khi routes được thiết lập
      // (ví dụ: dùng react-router navigate, hoặc dispatch action logout).
      window.location.href = '/login'
    }
    return Promise.reject(error)
  },
)

export default axiosClient
