import { createBrowserRouter } from 'react-router-dom'
import App from '../App'
import { LoginPage } from '../pages/auth/LoginPage'
import { RegisterPage } from '../pages/auth/RegisterPage'
import { ActivatePage } from '../pages/auth/ActivatePage'
import { ForgotPasswordPage } from '../pages/auth/ForgotPasswordPage'
import { ResetPasswordPage } from '../pages/auth/ResetPasswordPage'
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
    path: ROUTES.ACTIVATE,
    element: <ActivatePage />,
  },
  {
    path: ROUTES.FORGOT_PASSWORD,
    element: <ForgotPasswordPage />,
  },
  {
    path: ROUTES.RESET_PASSWORD,
    element: <ResetPasswordPage />,
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
