import { createBrowserRouter } from 'react-router-dom'
import App from '../App'
import { LoginPage } from '../pages/auth/LoginPage'
import { RegisterPage } from '../pages/auth/RegisterPage'
import { ForgotPasswordPage } from '../pages/auth/ForgotPasswordPage'
import { ProfilePage } from '../pages/profile/ProfilePage'
import { PublicLayout } from '../components/layouts/PublicLayout'
import { AuthGuard } from '../components/layouts/AuthGuard'
import { ROUTES } from './paths'

export const router = createBrowserRouter([
  {
    path: ROUTES.LOGIN,
    element: <LoginPage />,
  },
  {
    path: ROUTES.REGISTER,
    element: <RegisterPage />,
  },
  {
    path: ROUTES.FORGOT_PASSWORD,
    element: <ForgotPasswordPage />,
  },
  {
    element: <PublicLayout />,
    children: [
      {
        path: ROUTES.HOME,
        element: <App />,
      },
      {
        element: <AuthGuard />,
        children: [
          {
            path: ROUTES.PROFILE,
            element: <ProfilePage />,
          },
        ]
      }
    ]
  }
])

export default router
