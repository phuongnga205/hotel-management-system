import axios from 'axios'
import { router } from '../router'
import { ROUTES } from '../router/paths'
import { env } from '../config/env'

/**
 * Axios instance dùng chung cho toàn bộ app.
 * Thay vì phải tự tay gắn Authorization header ở từng chỗ gọi API,
 * ta dùng "interceptor" để axios tự động làm việc đó trước mỗi request.
 */
export const axiosClient = axios.create({
  baseURL: env.apiBaseUrl,
  // Không set cứng Content-Type ở đây: để axios tự suy ra theo dữ liệu gửi đi
  // (application/json cho object thường, multipart/form-data khi truyền
  // FormData để upload file...). Set cứng application/json sẽ làm hỏng các
  // request upload FormData.
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

// Các endpoint tự nó là hành động đăng nhập: nếu chính các API này trả 401
// (sai tài khoản/mật khẩu) thì đó là lỗi nghiệp vụ bình thường, không phải
// token hết hạn -> không được tự reload/redirect, để form login còn hiển thị
// thông báo lỗi và giữ lại dữ liệu người dùng đã nhập.
const AUTH_ENDPOINTS = ['/auth/login']

function isAuthEndpoint(url?: string): boolean {
  if (!url) return false
  return AUTH_ENDPOINTS.some((endpoint) => url.includes(endpoint))
}

// --- RESPONSE INTERCEPTOR ---
// Chạy sau khi nhận response: nếu backend trả 401 (token hết hạn / không hợp lệ)
// từ một API cần xác thực (không phải chính API đăng nhập), tự động xoá token
// và điều hướng về trang login qua router (không dùng window.location.href để
// tránh reload cứng cả trang, mất state của SPA).
axiosClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && !isAuthEndpoint(error.config?.url)) {
      clearAccessToken()
      void router.navigate(ROUTES.LOGIN)
    }
    return Promise.reject(error)
  },
)

export default axiosClient
