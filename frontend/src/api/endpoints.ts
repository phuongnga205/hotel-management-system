/**
 * Nguồn chân lý duy nhất cho các API endpoint path (khớp với backend, không
 * tính global prefix /api/v1 vì đã nằm trong baseURL). Dùng chung ở mọi nơi
 * cần so khớp/gọi endpoint thay vì gõ cứng chuỗi path.
 */
export const API_ENDPOINTS = {
  AUTH_LOGIN: '/auth/login',
  AUTH_REGISTER: '/auth/register',
  AUTH_ACTIVATE: '/auth/activate',
  AUTH_FORGOT_PASSWORD: '/auth/forgot-password',
  AUTH_RESET_PASSWORD: '/auth/reset-password',
  USERS_ME: '/users/me',
  USERS_ME_PASSWORD: '/users/me/password',

  ROOMS: '/rooms',
  ROOMS_AVAILABLE: '/rooms/available',
  ROOM_DETAIL: (id: string) => `/rooms/${id}`,

  ADMIN_ROOMS: '/admin/rooms',
  ADMIN_ROOMS_EXPORT: '/admin/rooms/export',
  ADMIN_ROOM_DETAIL: (id: string) => `/admin/rooms/${id}`,
  ADMIN_ROOM_IMAGES: (roomId: string) => `/admin/rooms/${roomId}/images`,
  ADMIN_ROOM_IMAGE_DETAIL: (roomId: string, imageId: string) => `/admin/rooms/${roomId}/images/${imageId}`,
  ADMIN_ROOM_IMAGE_THUMBNAIL: (roomId: string, imageId: string) => `/admin/rooms/${roomId}/images/${imageId}/thumbnail`,
  ADMIN_ROOM_AMENITIES: (roomId: string) => `/admin/rooms/${roomId}/amenities`,
  ADMIN_ROOM_AMENITY_DETAIL: (roomId: string, amenityId: string) => `/admin/rooms/${roomId}/amenities/${amenityId}`,

  AMENITIES: '/amenities',
  AMENITY_DETAIL: (id: string) => `/amenities/${id}`,

  BOOKINGS: '/bookings',
  BOOKINGS_ME: '/bookings/me',
  BOOKING_DETAIL: (id: string) => `/bookings/${id}`,
  BOOKING_CANCEL: (id: string) => `/bookings/${id}/cancel`,

  ADMIN_BOOKINGS: '/admin/bookings',
  ADMIN_BOOKING_DETAIL: (id: string) => `/admin/bookings/${id}`,
  ADMIN_BOOKING_ACCEPT: (id: string) => `/admin/bookings/${id}/accept`,
  ADMIN_BOOKING_REJECT: (id: string) => `/admin/bookings/${id}/reject`,

  REVIEWS: '/reviews',
  ROOM_REVIEWS: (roomId: string) => `/rooms/${roomId}/reviews`,

  ADMIN_REVIEWS: '/admin/reviews',
  ADMIN_REVIEW_DETAIL: (id: string) => `/admin/reviews/${id}`,

  ADMIN_EMAIL_LOGS: '/admin/email-logs',
  ADMIN_EMAIL_LOG_DETAIL: (id: string) => `/admin/email-logs/${id}`,
  ADMIN_EMAIL_LOG_RETRY: (id: string) => `/admin/email-logs/${id}/retry`,

  ADMIN_USERS: '/admin/users',
  ADMIN_USER_DETAIL: (id: string) => `/admin/users/${id}`,

  ADMIN_STATISTICS_BOOKINGS: '/admin/statistics/bookings',
  ADMIN_STATISTICS_REVENUE: '/admin/statistics/revenue',
} as const
