import { useEffect, useState } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { getAccessToken } from '../../api/axiosClient'
import { userApi } from '../../api/user.api'
import { ROUTES } from '../../router/paths'
import { PageLoader } from '../common/PageLoader'

/**
 * Guard cho toan bo khu vuc /admin/**: yeu cau da dang nhap VA co role
 * ADMIN. Khac AuthGuard (chi can co token), guard nay phai goi API lay
 * profile de biet role vi role khong duoc luu san o localStorage/token.
 */
export const AdminGuard = () => {
  const location = useLocation()
  const isAuthenticated = !!getAccessToken()
  const [checking, setChecking] = useState(isAuthenticated)
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    if (!isAuthenticated) return
    let cancelled = false
    userApi
      .getProfile()
      .then((profile) => {
        if (!cancelled) setIsAdmin(profile.role === 'ADMIN')
      })
      .catch(() => {
        if (!cancelled) setIsAdmin(false)
      })
      .finally(() => {
        if (!cancelled) setChecking(false)
      })
    return () => {
      cancelled = true
    }
  }, [isAuthenticated])

  if (!isAuthenticated) {
    return <Navigate to={`${ROUTES.LOGIN}?redirect=${encodeURIComponent(location.pathname)}`} replace />
  }

  if (checking) {
    return <PageLoader />
  }

  if (!isAdmin) {
    return <Navigate to={ROUTES.HOME} replace />
  }

  return <Outlet />
}
