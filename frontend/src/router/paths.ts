/**
 * Nguồn chân lý duy nhất cho các route path trong app.
 * Mọi nơi cần điều hướng (router config, navigate(), Link to=...) đều phải
 * import từ đây thay vì gõ cứng chuỗi path, tránh lệch nhau khi đổi route.
 */
export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  ACTIVATE: '/activate',
  FORGOT_PASSWORD: '/forgot-password',
  RESET_PASSWORD: '/reset-password',
  PROFILE: '/profile',
} as const
