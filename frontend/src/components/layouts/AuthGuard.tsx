import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { getAccessToken } from '../../api/axiosClient'
import { ROUTES } from '../../router/paths'

export const AuthGuard = () => {
  const isAuthenticated = !!getAccessToken()
  const location = useLocation()

  if (!isAuthenticated) {
    return <Navigate to={`${ROUTES.LOGIN}?redirect=${encodeURIComponent(location.pathname)}`} replace />
  }

  return <Outlet />
}
