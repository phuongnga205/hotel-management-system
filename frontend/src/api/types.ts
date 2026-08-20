/**
 * Type dùng chung giữa lớp API thật (`*.api.ts`) và lớp mock
 * (`mocks/*.mock.ts`) — tách riêng ra đây để 2 bên implement cùng 1 hợp đồng
 * mà không phải import chéo nhau. Union type enum copy đúng theo
 * `frontend/docs/bridge.md` (mục "Bảng tra nhanh các enum").
 */

export type UserRole = 'USER' | 'ADMIN'
export type UserStatus = 'ACTIVE' | 'INACTIVE'

// --- users (theo đúng field thật của bảng `users`, xem bridge.md — không có
// address/gender/nationality/dob) ---
export interface UserProfile {
  id: string
  username: string
  email: string
  fullName: string | null
  phone: string | null
  avatarUrl: string | null
  role: UserRole
  status: UserStatus
}

export interface UpdateProfilePayload {
  fullName?: string
  phone?: string
}

export interface ChangePasswordPayload {
  currentPassword: string
  newPassword: string
}

// --- auth ---
export interface LoginPayload {
  email: string
  password: string
}

export interface LoginResponse {
  message: string
  accessToken: string
  user: UserProfile
}

export interface RegisterPayload {
  email: string
  password: string
  username: string
  phone?: string
}

export interface RegisterResponse {
  message: string
  user: UserProfile
}

export interface ActivatePayload {
  email: string
  otp: string
}

export interface ForgotPasswordPayload {
  email: string
}

export interface ResetPasswordPayload {
  email: string
  otp: string
  newPassword: string
}

// Activate/forgotPassword/resetPassword: BE chưa implement 3 endpoint này
// (chỉ mới có trong docs) nên chưa biết chắc shape response thật — tạm coi
// như trả `{ message }` không bọc envelope, giống style hiện tại của
// `login`/`register` (2 endpoint BE đã làm thật, cũng không bọc
// `{statusCode, message, data}` — interceptor đó còn là TODO trong
// backend/docs/DANH_SACH_API.md). Sửa lại type này khi BE chốt.
export interface MessageResponse {
  message: string
}

// --- pagination (moi endpoint list dung chung 1 shape, xem
// backend/docs/DANH_SACH_API.md + frontend/docs/bridge.md - page/limit,
// KHONG PHAI skip/take) ---
export interface ListQuery {
  page?: number
  limit?: number
}

export interface PagedResult<T> {
  items: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}

// --- rooms (theo dung field that cua bang `rooms`, xem bridge.md -
// KHONG co floor/area/maxGuests/averageRating/reviewCount, nhung field do
// khong ton tai o backend) ---
export type RoomStatus = 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE'
export type RoomViewType = 'CITY_VIEW' | 'GARDEN_VIEW' | 'SEA_VIEW'

export interface RoomAmenitySummary {
  id: string
  name: string
}

export interface RoomImage {
  id: string
  roomId: string
  imageUrl: string
  isThumbnail: boolean
  createdAt: string
}

export interface Room {
  id: string
  roomNumber: string
  name: string
  // Chuoi tu do, KHONG phai enum - backend khong gioi han gia tri (chi
  // required + not-empty khi tao phong), khong duoc coi la 1 tap co dinh.
  roomType: string
  description: string | null
  viewType: RoomViewType | null
  capacity: number
  pricePerNight: number
  status: RoomStatus
  amenities?: RoomAmenitySummary[]
  images?: RoomImage[]
}

export interface CreateRoomPayload {
  roomNumber: string
  name: string
  roomType: string
  description?: string
  viewType?: RoomViewType
  capacity: number
  pricePerNight: number
  amenityIds?: string[]
}

export interface UpdateRoomPayload {
  name?: string
  roomType?: string
  description?: string
  viewType?: RoomViewType
  capacity?: number
  status?: RoomStatus
}

export interface ListRoomsQuery extends ListQuery {
  search?: string
  status?: RoomStatus
}

// --- amenities ---
export interface Amenity {
  id: string
  name: string
  description: string | null
  createdAt: string
  updatedAt: string
}

export interface CreateAmenityPayload {
  name: string
  description?: string
}

export interface UpdateAmenityPayload {
  name?: string
  description?: string
}

// --- bookings ---
export type BookingStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'CANCELLED' | 'EXPIRED'

export interface BookingRoomSummary {
  id: string
  name: string
  roomNumber: string
  thumbnailUrl?: string | null
}

export interface BookingUserSummary {
  id: string
  fullName: string | null
  email: string
  phone: string | null
}

export interface Booking {
  id: string
  status: BookingStatus
  checkInDate: string
  checkOutDate: string
  pricePerNight: number
  totalPrice: number
  note: string | null
  cancelReason: string | null
  createdAt: string
  room?: BookingRoomSummary
  user?: BookingUserSummary
  payment?: Payment
}

export interface CreateBookingPayload {
  roomId: string
  checkInDate: string
  checkOutDate: string
  note?: string
}

export interface ListBookingsQuery extends ListQuery {
  status?: BookingStatus
  search?: string
}

export interface RejectBookingPayload {
  cancelReason?: string
}

// --- payments ---
export type PaymentMethod = 'CASH' | 'BANK_TRANSFER' | 'CREDIT_CARD' | 'VNPAY'
export type PaymentStatus = 'PENDING' | 'SUCCESS' | 'FAILED' | 'REFUNDED'

export interface Payment {
  id: string
  bookingId: string
  // Cot decimal khong co transformer o BE -> LUON la string, phai tu
  // Number() khi hien thi/tinh toan, khong duoc coi la number.
  amount: string
  method: PaymentMethod
  status: PaymentStatus
  transactionId: string | null
  paidAt: string | null
  createdAt: string
}

// --- reviews (khong co field "status" that o backend - review chi ton tai
// hoac bi soft-delete; `deletedAt` la nguon duy nhat de suy ra trang thai
// hien thi, khong phai 1 enum rieng) ---
export interface Review {
  id: string
  bookingId: string
  rating: number
  comment: string | null
  deleteReason: string | null
  createdAt: string
  deletedAt: string | null
  room?: BookingRoomSummary
  user?: BookingUserSummary
}

export interface ListReviewsQuery extends ListQuery {
  roomId?: string
}

export interface DeleteReviewPayload {
  deleteReason?: string
}

// --- email logs (EmailType dung 4 gia tri that o backend - KHONG co
// 'password-changed', bridge.md liet ke nham gia tri nay) ---
export type EmailType = 'account-activation' | 'password-reset' | 'booking-status-changed' | 'review-deleted'
export type EmailStatus = 'PENDING' | 'SENT' | 'FAILED'

export interface EmailLog {
  id: string
  type: EmailType
  // Dung dung ten cot that trong bang email_logs (xem backend/db.md) - KHONG
  // co cot "subject" rieng, khong duoc bay dat them field nay.
  recipient: string
  status: EmailStatus
  sentAt: string | null
  lastError: string | null
  retryCount: number
  createdAt: string
}

export interface ListEmailLogsQuery extends ListQuery {
  status?: EmailStatus
}

// --- admin users ---
export interface AdminUserListItem extends UserProfile {
  createdAt: string
}

export interface ListAdminUsersQuery extends ListQuery {
  search?: string
  role?: UserRole
  status?: UserStatus
}

export interface AdminUpdateUserPayload {
  fullName?: string
  phone?: string
  role?: UserRole
  status?: UserStatus
}

// --- statistics ---
export interface BookingStatisticsSeriesPoint {
  month: string
  count: number
}

export interface BookingStatistics {
  totalBookings: number
  byStatus: Record<BookingStatus, number>
  monthly: BookingStatisticsSeriesPoint[]
}

export interface RevenueStatisticsSeriesPoint {
  month: string
  revenue: number
}

export interface RevenueByRoomType {
  roomType: string
  revenue: number
}

export interface RevenueStatistics {
  totalRevenue: number
  monthly: RevenueStatisticsSeriesPoint[]
  byRoomType: RevenueByRoomType[]
}
