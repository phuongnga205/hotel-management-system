import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { ROUTES } from '../../router/paths'
import { PageLoader } from '../common/PageLoader'
import { useAuth } from '../../hooks/useAuth'

/**
 * Guard cho toan bo khu vuc /admin/**: yeu cau da dang nhap VA co role
 * ADMIN. Khac AuthGuard (chi can co token) - role doc lai tu AuthContext
 * (useAuth(), xem contexts/AuthProvider.tsx) thay vi tu goi rieng
 * userApi.getProfile() moi lan vao /admin/** nhu truoc - AuthProvider da
 * fetch san 1 lan luc app mount, o day chi doc lai state co san.
 */
export const AdminGuard = () => {
  const location = useLocation()
  const { isAuthenticated, isAdmin, loading } = useAuth()

  if (!isAuthenticated && !loading) {
    return <Navigate to={`${ROUTES.LOGIN}?redirect=${encodeURIComponent(location.pathname)}`} replace />
  }

  if (loading) {
    return <PageLoader />
  }

  if (!isAdmin) {
    return <Navigate to={ROUTES.FORBIDDEN} replace />
  }

  return <Outlet />
}
