/**
 * Nguồn chân lý duy nhất cho các API endpoint path (khớp với backend, không
 * tính global prefix /api/v1 vì đã nằm trong baseURL). Dùng chung ở mọi nơi
 * cần so khớp/gọi endpoint thay vì gõ cứng chuỗi path.
 */
export const API_ENDPOINTS = {
  AUTH_LOGIN: '/auth/login',
  AUTH_REGISTER: '/auth/register',
  AUTH_FORGOT_PASSWORD: '/auth/forgot-password',
  AUTH_RESET_PASSWORD: '/auth/reset-password',
  USERS_ME: '/users/me',
} as const
