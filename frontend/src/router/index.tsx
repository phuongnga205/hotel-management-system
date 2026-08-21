import { createBrowserRouter } from 'react-router-dom'
import HomePage from '../pages/HomePage'
import { LoginPage } from '../pages/auth/LoginPage'
import { RegisterPage } from '../pages/auth/RegisterPage'
import { ActivatePage } from '../pages/auth/ActivatePage'
import { ForgotPasswordPage } from '../pages/auth/ForgotPasswordPage'
import { ResetPasswordPage } from '../pages/auth/ResetPasswordPage'
import { ProfilePage } from '../pages/profile/ProfilePage'
import { PublicLayout } from '../components/layouts/PublicLayout'
import { AuthGuard } from '../components/layouts/AuthGuard'
import { AdminGuard } from '../components/layouts/AdminGuard'
import { AdminLayout } from '../components/layouts/AdminLayout'
import AdminDashboardPage from '../pages/admin/AdminDashboardPage'
import AdminRoomListPage from '../pages/admin/rooms/AdminRoomListPage'
import AdminRoomDetailPage from '../pages/admin/rooms/AdminRoomDetailPage'
import AdminRoomCreatePage from '../pages/admin/rooms/AdminRoomCreatePage'
import AdminRoomEditPage from '../pages/admin/rooms/AdminRoomEditPage'
import AdminAmenityListPage from '../pages/admin/amenities/AdminAmenityListPage'
import AdminBookingListPage from '../pages/admin/bookings/AdminBookingListPage'
import AdminBookingDetailPage from '../pages/admin/bookings/AdminBookingDetailPage'
import AdminUserListPage from '../pages/admin/users/AdminUserListPage'
import AdminUserDetailPage from '../pages/admin/users/AdminUserDetailPage'
import AdminReviewListPage from '../pages/admin/reviews/AdminReviewListPage'
import AdminBookingStatsPage from '../pages/admin/statistics/AdminBookingStatsPage'
import AdminRevenueStatsPage from '../pages/admin/statistics/AdminRevenueStatsPage'
import AdminEmailLogListPage from '../pages/admin/email-logs/AdminEmailLogListPage'
import AdminEmailLogDetailPage from '../pages/admin/email-logs/AdminEmailLogDetailPage'
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
        element: <HomePage />,
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
  },
  {
    element: <AdminGuard />,
    children: [
      {
        element: <AdminLayout />,
        children: [
          { path: ROUTES.ADMIN.DASHBOARD, element: <AdminDashboardPage /> },
          { path: ROUTES.ADMIN.ROOMS, element: <AdminRoomListPage /> },
          { path: ROUTES.ADMIN.ROOM_NEW, element: <AdminRoomCreatePage /> },
          { path: ROUTES.ADMIN.ROOM_DETAIL(':roomId'), element: <AdminRoomDetailPage /> },
          { path: ROUTES.ADMIN.ROOM_EDIT(':roomId'), element: <AdminRoomEditPage /> },
          { path: ROUTES.ADMIN.AMENITIES, element: <AdminAmenityListPage /> },
          { path: ROUTES.ADMIN.BOOKINGS, element: <AdminBookingListPage /> },
          { path: ROUTES.ADMIN.BOOKING_DETAIL(':bookingId'), element: <AdminBookingDetailPage /> },
          { path: ROUTES.ADMIN.USERS, element: <AdminUserListPage /> },
          { path: ROUTES.ADMIN.USER_DETAIL(':userId'), element: <AdminUserDetailPage /> },
          { path: ROUTES.ADMIN.REVIEWS, element: <AdminReviewListPage /> },
          { path: ROUTES.ADMIN.STATS_BOOKINGS, element: <AdminBookingStatsPage /> },
          { path: ROUTES.ADMIN.STATS_REVENUE, element: <AdminRevenueStatsPage /> },
          { path: ROUTES.ADMIN.EMAIL_LOGS, element: <AdminEmailLogListPage /> },
          { path: ROUTES.ADMIN.EMAIL_LOG_DETAIL(':logId'), element: <AdminEmailLogDetailPage /> },
        ],
      },
    ],
  },
])

export default router
