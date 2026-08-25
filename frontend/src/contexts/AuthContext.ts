import { createContext } from 'react'
import type { UserProfile } from '../api/types'

/**
 * Nguồn chân lý duy nhất cho trạng thái đăng nhập + role trong toàn app -
 * xem `AuthProvider.tsx` (component bọc app) và `hooks/useAuth.ts` (hook
 * đọc lại context này). Tách riêng ra file `.ts` không có JSX vì 1 file vừa
 * export component vừa export value khác sẽ làm hỏng React Fast Refresh
 * (react-refresh/only-export-components) - cùng lý do `statusConfigs.ts`
 * tách khỏi `StatusBadge.tsx`.
 */
export interface AuthContextValue {
  user: UserProfile | null
  isAuthenticated: boolean
  isAdmin: boolean
  // true trong lúc đang fetch profile lần đầu (hoặc refetch) - dùng để
  // tránh render nhầm UI "chưa đăng nhập"/"user thường" trong 1 nhịp trước
  // khi biết chắc role, đặc biệt quan trọng cho AdminGuard.
  loading: boolean
  refreshUser: () => Promise<void>
  logout: () => void
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined)
