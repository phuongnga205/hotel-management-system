import { createBrowserRouter } from 'react-router-dom'
import App from '../App'
import LoginPage from '../pages/LoginPage'
import { ROUTES } from './paths'

/**
 * Router instance dùng chung cho toàn bộ app.
 * Được tạo ở module scope (thay vì bên trong component) để những nơi nằm
 * ngoài React tree (ví dụ: axios interceptor) cũng có thể điều hướng qua
 * router.navigate(...) mà không cần reload lại trang.
 */
export const router = createBrowserRouter([
  {
    path: ROUTES.HOME,
    element: <App />,
  },
  {
    path: ROUTES.LOGIN,
    element: <LoginPage />,
  },
])

export default router
