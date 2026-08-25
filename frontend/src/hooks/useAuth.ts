import { useContext } from 'react'
import { AuthContext, type AuthContextValue } from '../contexts/AuthContext'

/** Đọc lại trạng thái đăng nhập/role từ `AuthProvider` (bọc app ở `main.tsx`). */
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth() must be used within <AuthProvider>')
  return ctx
}
