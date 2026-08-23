/**
 * Mock cho User API — dùng khi `env.useMock === true` (mặc định, xem
 * `src/config/env.ts`). `/users/me*` hiện CHƯA được implement ở BE
 * (`backend/src/users/users.controller.ts` mới chỉ có CRUD theo `:id` kiểu
 * admin, chưa có route self-service `me`), nên tạm chưa biết chắc response
 * thật bọc envelope hay không — field theo đúng bảng `users` đã chốt ở
 * `frontend/docs/bridge.md` (không có address/gender/nationality/dob).
 */
import type { ChangePasswordPayload, MessageResponse, UpdateProfilePayload, UserProfile } from '../types'
import { getMockRole } from './mockSession'

const MOCK_DELAY_MS = 500
const MOCK_AVATAR_URL = 'https://i.pravatar.cc/150?img=11'

function mockDelay<T>(data: T, ms = MOCK_DELAY_MS): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(data), ms))
}

// "DB" giả trong bộ nhớ để updateProfile phản ánh lại đúng giá trị vừa lưu
// khi gọi getProfile lần sau trong cùng phiên — tránh cảm giác lưu xong bị
// mất do mock luôn trả data tĩnh.
let mockProfile: UserProfile = {
  id: '1',
  username: 'nguyenvana',
  email: 'nguyenvana@gmail.com',
  fullName: 'Nguyễn Văn A',
  phone: '0901234567',
  avatarUrl: MOCK_AVATAR_URL,
  role: 'USER',
  status: 'ACTIVE',
}

export const userMockApi = {
  getProfile: async (): Promise<UserProfile> => {
    // Role phai khop voi role da suy ra luc login (mock) - xem mockSession.ts
    // va authMockApi.login o auth.mock.ts.
    return mockDelay({ ...mockProfile, role: getMockRole() })
  },
  updateProfile: async (data: UpdateProfilePayload): Promise<UserProfile> => {
    mockProfile = { ...mockProfile, ...data }
    return mockDelay(mockProfile)
  },
  changePassword: async (_data: ChangePasswordPayload): Promise<MessageResponse> => {
    return mockDelay({ message: 'Đổi mật khẩu thành công (mock).' })
  },
}
