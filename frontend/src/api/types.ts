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
