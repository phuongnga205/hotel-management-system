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

export interface MessageResponse {
  message: string
}

export interface AuthMessageResponse extends MessageResponse {
  statusCode: number
  data: null
}

// --- pagination (moi endpoint list dung chung 1 shape, xem
// backend/docs/DANH_SACH_API.md + frontend/docs/bridge.md - page/limit,
// KHONG PHAI skip/take) ---
export interface ListQuery {
  page?: number
  limit?: number
}

// Dung chung cho moi query list o Admin ho tro sap xep theo thoi gian tao
// (moi nhat/cu nhat truoc) - khop enum SortOrder o BE
// (backend/src/common/enums/sort-order.enum.ts).
export type SortOrder = 'ASC' | 'DESC'

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
  // Cot decimal khong co transformer o BE (RoomResponseDto ep .toString())
  // -> LUON la string, phai tu Number() khi hien thi/tinh toan, khong duoc
  // coi la number (khac CreateRoomPayload/UpdateRoomPayload - request van
  // gui number).
  pricePerNight: string
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

// Cot dung de sap xep o GET /admin/rooms - khop RoomSortBy o BE
// (backend/src/rooms/dto/list-rooms.dto.ts). "price"/"capacity" phuc vu nut
// sap xep tang/giam rieng cho 2 cot do o AdminRoomListPage.
export type RoomSortBy = 'createdAt' | 'price' | 'capacity'

export interface ListRoomsQuery extends ListQuery {
  search?: string
  status?: RoomStatus
  // Chi ap dung khi goi roomApi.listPublic() (GET /rooms cong khai) - loc
  // theo room.capacity >= guests. BE khong nhan field nay o GET /admin/rooms
  // (admin khong can tim theo suc chua), du type nay dang dung chung cho ca
  // 2 (xem room.api.ts).
  guests?: number
  // Cac field duoi day chi BE /admin/rooms ho tro (GET /rooms cong khai bo qua).
  sortOrder?: SortOrder
  // Loc rieng theo loai phong - khac `search` (gop chung roomNumber/name/roomType).
  roomType?: string
  sortBy?: RoomSortBy
}

// Khop FindAvailableRoomsDto o BE (GET /rooms/available) - truoc day chua
// co type nao khop shape nay o FE, endpoint constant ROOMS_AVAILABLE ton
// tai san nhung chua method nao goi (xem room.api.ts listAvailable()).
export interface ListAvailableRoomsQuery extends ListQuery {
  checkIn: string
  checkOut: string
  minPrice?: number
  maxPrice?: number
  amenities?: string[]
  guests?: number
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

export interface ListAmenitiesQuery extends ListQuery {
  search?: string
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
  // Bat buoc khi tao (CreateBookingPayload), co dinh sau khi tao - KHONG co
  // trong UpdateBookingPayload (PATCH /bookings/:id khong cho sua guests).
  // Duoc validate <= room.capacity o BE, va nhan vao cong thuc totalPrice.
  guests: number
  // Cung ly do voi Room.pricePerNight - BE ep .toString() truoc khi tra ve,
  // LUON la string, phai tu Number() khi hien thi/tinh toan.
  pricePerNight: string
  // = nights * pricePerNight * guests (BE tu tinh, FE khong gui).
  totalPrice: string
  note: string | null
  cancelReason: string | null
  createdAt: string
  room?: BookingRoomSummary
  user?: BookingUserSummary
  payment?: Payment
  // true khi booking nay da co 1 review (con hieu luc) - moi booking chi
  // duoc review dung 1 lan (xem backend/src/reviews/entities/review.entity.ts),
  // dung de FE an nut "Write Review" thay vi de user bam lai va an loi 409
  // ALREADY_REVIEWED. Chi GET /bookings/me (findHistory) tra ve field nay.
  hasReview?: boolean
}

export interface CreateBookingPayload {
  roomId: string
  checkInDate: string
  checkOutDate: string
  // Bat buoc, validate <= room.capacity o BE (400 GUESTS_EXCEED_CAPACITY
  // neu vuot) - anh huong truc tiep totalPrice tra ve.
  guests: number
  note?: string
}

export interface UpdateBookingPayload {
  checkInDate: string
  checkOutDate: string
}

export interface ListBookingsQuery extends ListQuery {
  status?: BookingStatus
  search?: string
  sortOrder?: SortOrder
}

// Khop CancelBookingDto o BE (PATCH /bookings/:id/cancel) - cung ten field
// "cancelReason" nhu RejectBookingPayload (admin reject) vi ca 2 dung chung
// 1 cot DB bookings.cancel_reason, xem bridge.md muc 6.
export interface CancelBookingPayload {
  cancelReason?: string
}

export interface RejectBookingPayload {
  cancelReason?: string
}

// amount KHONG co o day - server luon tu tinh tu booking.totalPrice, khong
// nhan so tien tu FE (xem backend/src/bookings/dto/pay-booking.dto.ts).
export interface PayBookingPayload {
  method: PaymentMethod
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

// --- self-service payments (GET /payments/me, khac /admin/payments -
// khong kem thong tin khach vi user tu biet do la chinh minh, xem
// backend/docs/DANH_SACH_API.md muc 4a) ---
export interface PaymentBookingSummary {
  id: string
  roomName: string
  roomNumber: string
  checkInDate: string
  checkOutDate: string
}

export interface UserPayment extends Payment {
  booking?: PaymentBookingSummary
}

export interface ListPaymentsQuery extends ListQuery {
  status?: PaymentStatus
  method?: PaymentMethod
}

// --- admin payments (GET /admin/payments, dung o man Statistics > Revenue -
// xem backend/docs/DANH_SACH_API.md muc 11) ---
export interface AdminPaymentBookingSummary {
  id: string
  guestName: string | null
  guestEmail: string
  roomName: string
  roomNumber: string
}

export interface AdminPayment extends Payment {
  booking?: AdminPaymentBookingSummary
}

export interface ListAdminPaymentsQuery extends ListQuery {
  status?: PaymentStatus
  method?: PaymentMethod
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
  // Chi endpoint admin (GET /admin/reviews) ap dung - findAllForUser()/
  // findByRoom() o BE van hardcode moi nhat truoc, khong doc field nay.
  sortOrder?: SortOrder
}

// --- email logs ---
export type EmailType = 'account-activation' | 'password-reset' | 'booking-status-changed' | 'review-deleted' | 'monthly-report'
export type EmailStatus = 'PENDING' | 'SENT' | 'FAILED' | 'DELIVERED_UNCONFIRMED'

export interface EmailLog {
  id: string
  type: EmailType
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
  sortOrder?: SortOrder
}

export interface AdminUpdateUserPayload {
  fullName?: string
  phone?: string
  role?: UserRole
  status?: UserStatus
}

// Khop CreateUserDto o BE (POST /admin/users) - tai khoan tao qua duong nay
// luon duoc kich hoat ngay (status=ACTIVE), khong nhan status/role tu FE
// (role mac dinh USER o BE, doi lai qua adminUserApi.update() sau khi tao).
export interface AdminCreateUserPayload {
  email: string
  password: string
  username: string
  phone?: string
}

// --- statistics ---
// Khớp `GET /statistics/revenue-bookings` (backend/src/statistics) — 1 route
// gộp trả cả doanh thu lẫn số booking, gộp theo ngày/tháng/quý.
export type StatisticsPeriod = 'DAY' | 'MONTH' | 'QUARTER'

export interface StatisticsQuery {
  period: StatisticsPeriod
  year: number
  /** Bắt buộc khi period = DAY, bỏ qua với MONTH/QUARTER. */
  month?: number
}

export interface StatisticsBucket {
  /** vd "2026-08" (MONTH), "2026-Q3" (QUARTER), "2026-08-24" (DAY). */
  label: string
  /** Số tiền dạng string 2 chữ số thập phân, vd "12500000.00". */
  revenue: string
  bookingCount: number
}

export interface RevenueBookingsStatistics {
  period: StatisticsPeriod
  year: number
  month: number | null
  totalRevenue: string
  totalBookings: number
  buckets: StatisticsBucket[]
  isCached: boolean
}
