/**
 * Mock cho Auth API — dùng khi `env.useMock === true` (mặc định, xem
 * `src/config/env.ts`). Đây là nguồn DUY NHẤT chứa `setTimeout`/data giả cho
 * auth; `src/api/auth.api.ts` chỉ quyết định chọn file này hay gọi thật, bản
 * thân nó không còn chứa logic mock.
 *
 * Response giả lập cố tình đi đúng shape response thật hiện tại của BE
 * (`login`/`register` — 2 endpoint duy nhất đã implement thật, xem
 * `backend/src/auth/auth.service.ts`): trả thẳng `{ message, ... }`, KHÔNG
 * bọc `{statusCode, data}` (envelope đó còn là 🚧 TODO ở
 * `backend/docs/DANH_SACH_API.md`). `activate`/`forgotPassword`/
 * `resetPassword` chưa có endpoint thật nào để soi theo, tạm dùng cùng
 * style `{ message }` cho nhất quán — sửa lại khi BE làm xong.
 */
import type {
  ActivatePayload,
  ForgotPasswordPayload,
  LoginPayload,
  LoginResponse,
  MessageResponse,
  RegisterPayload,
  RegisterResponse,
  ResetPasswordPayload,
  UserProfile,
} from '../types'

const MOCK_DELAY_MS = 500

function mockDelay<T>(data: T, ms = MOCK_DELAY_MS): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(data), ms))
}

function buildMockUser(overrides: Partial<UserProfile>): UserProfile {
  return {
    id: '1',
    username: 'nguyenvana',
    email: 'nguyenvana@gmail.com',
    fullName: 'Nguyễn Văn A',
    phone: '0901234567',
    avatarUrl: null,
    role: 'USER',
    status: 'ACTIVE',
    ...overrides,
  }
}

export const authMockApi = {
  login: async (data: LoginPayload): Promise<LoginResponse> => {
    return mockDelay({
      message: 'Đăng nhập thành công (mock).',
      accessToken: 'fake_mock_token',
      user: buildMockUser({ email: data.email }),
    })
  },
  register: async (data: RegisterPayload): Promise<RegisterResponse> => {
    return mockDelay({
      message: 'Đăng ký thành công (mock).',
      user: buildMockUser({ email: data.email, username: data.username, phone: data.phone ?? null, status: 'INACTIVE' }),
    })
  },
  activate: async (_data: ActivatePayload): Promise<MessageResponse> => {
    return mockDelay({ message: 'Kích hoạt tài khoản thành công (mock).' })
  },
  forgotPassword: async (_data: ForgotPasswordPayload): Promise<MessageResponse> => {
    return mockDelay({ message: 'Đã gửi mã OTP (mock).' })
  },
  resetPassword: async (_data: ResetPasswordPayload): Promise<MessageResponse> => {
    return mockDelay({ message: 'Đổi mật khẩu thành công (mock).' })
  },
}
