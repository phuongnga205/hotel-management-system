import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { userApi } from '../api/user.api'
import { getAccessToken, clearAccessToken } from '../api/axiosClient'
import { getErrorStatusCode } from '../api/errorMessage'
import { HTTP_STATUS } from '../constants/http'
import type { UserProfile } from '../api/types'
import { AuthContext, type AuthContextValue } from './AuthContext'

// Role luôn lấy từ `userApi.getProfile()` thật (có cặp real+mock như mọi
// API khác) - hoạt động giống nhau dù `VITE_USE_MOCK` là gì, sẵn sàng nối
// BE thật không cần sửa gì ở đây. Trước đây mỗi nơi cần biết "đã đăng nhập
// chưa"/"có phải admin không" tự gọi `getAccessToken()`/`userApi.getProfile()`
// riêng (Header.tsx chỉ check token, không biết role; AdminGuard.tsx tự
// fetch profile lần nữa mỗi lần vào /admin/**) - gộp về đây để chỉ fetch
// 1 lần/phiên, mọi nơi khác chỉ đọc lại qua `useAuth()`.
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState<boolean>(() => !!getAccessToken())

  const refreshUser = useCallback(async () => {
    if (!getAccessToken()) {
      setUser(null)
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const profile = await userApi.getProfile()
      setUser(profile)
    } catch (err) {
      // Chi coi la "chua dang nhap" khi BE xac nhan that qua 401 (token het
      // han/khong hop le - luc nay axiosClient's response interceptor cung
      // da tu clearAccessToken() roi). Loi khac (429 bi rate-limit, 500,
      // mat mang thoang qua luc reload trang) KHONG duoc suy dien la
      // logged-out - token trong localStorage van con nguyen ven va dung
      // duoc lai binh thuong, ep setUser(null) o day chi tao cam giac gia
      // "bam F5 la bi dang xuat" (Header/AuthGuard deu doc tu `user`) du
      // token that chua bao gio bi xoa. Giu nguyen `user` cu (state cua
      // request truoc, hoac null luc moi mount) cho cac loi tam thoi nay.
      if (getErrorStatusCode(err) === HTTP_STATUS.UNAUTHORIZED) {
        setUser(null)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refreshUser()
  }, [refreshUser])

  const logout = useCallback(() => {
    clearAccessToken()
    setUser(null)
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: !!user,
      isAdmin: user?.role === 'ADMIN',
      loading,
      refreshUser,
      logout,
    }),
    [user, loading, refreshUser, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
