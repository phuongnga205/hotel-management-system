/**
 * Trang thai "phien dang nhap" DUNG CHUNG giua cac mock (auth.mock.ts,
 * user.mock.ts...) khi env.useMock === true. auth.mock.ts va user.mock.ts
 * la 2 module doc lap, khong tu dong biet role cua nhau - can 1 noi luu
 * chung de userMockApi.getProfile() tra ve dung role vua dang nhap o
 * authMockApi.login().
 *
 * Luu vao localStorage (khong phai bien trong bo nho) de song sot qua lan
 * F5 - giong cach axiosClient.ts luu accessToken.
 */
import type { UserRole } from '../types'

const MOCK_ROLE_KEY = 'mockUserRole'

// Dang nhap bang email co chua "admin" (vd admin@example.com) de duoc mock
// gan role ADMIN - xem authMockApi.login trong auth.mock.ts.
export function roleForMockEmail(email: string): UserRole {
  return email.toLowerCase().includes('admin') ? 'ADMIN' : 'USER'
}

export function getMockRole(): UserRole {
  return (localStorage.getItem(MOCK_ROLE_KEY) as UserRole | null) ?? 'USER'
}

export function setMockRole(role: UserRole): void {
  localStorage.setItem(MOCK_ROLE_KEY, role)
}
