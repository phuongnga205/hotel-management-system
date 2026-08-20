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

  // Cong khai (chua co trang dich - se dung khi build man hinh danh sach/chi
  // tiet/dat phong o mot phien lam viec sau, gio moi co Trang chu tro toi).
  ROOMS: '/rooms',
  ROOM_DETAIL: (roomId: string) => `/rooms/${roomId}`,
  BOOK_ROOM: (roomId: string) => `/rooms/${roomId}/book`,

  ADMIN: {
    DASHBOARD: '/admin',
    ROOMS: '/admin/rooms',
    ROOM_NEW: '/admin/rooms/new',
    ROOM_DETAIL: (roomId: string) => `/admin/rooms/${roomId}`,
    ROOM_EDIT: (roomId: string) => `/admin/rooms/${roomId}/edit`,
    AMENITIES: '/admin/amenities',
    BOOKINGS: '/admin/bookings',
    BOOKING_DETAIL: (bookingId: string) => `/admin/bookings/${bookingId}`,
    USERS: '/admin/users',
    USER_DETAIL: (userId: string) => `/admin/users/${userId}`,
    REVIEWS: '/admin/reviews',
    STATS_BOOKINGS: '/admin/statistics/bookings',
    STATS_REVENUE: '/admin/statistics/revenue',
    EMAIL_LOGS: '/admin/email-logs',
    EMAIL_LOG_DETAIL: (logId: string) => `/admin/email-logs/${logId}`,
  },
} as const
