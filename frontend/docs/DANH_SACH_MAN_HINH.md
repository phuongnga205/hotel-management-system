# Danh sách màn hình (Pages) — mapping với API

> Dựa trên `frontend/docs/CAU_TRUC_ROUTE.md` (route) và
> `backend/docs/DANH_SACH_API.md` (API). Mỗi màn hình dưới đây ứng với 1
> page component theo cây thư mục đề xuất ở `src/pages/**`. Cột **API sử
> dụng** liệt kê endpoint mà màn hình đó gọi trực tiếp (không tính API của
> modal con nếu modal đã có trang riêng liệt kê).
>
> `🚧` = API tương ứng **chưa implement xong ở BE** (xem checklist trong
> `backend/docs/DANH_SACH_API.md`) — dựng UI trước, gắn API thật sau khi BE
> xong, không block việc code giao diện.

## A. Public

| Page component | Route | API sử dụng | Ghi chú |
|---|---|---|---|
| `pages/HomePage.tsx` | `/` | Không bắt buộc | Có thể gọi `GET /rooms` (lấy vài phòng nổi bật) nếu muốn, không phải yêu cầu gốc. |
| `pages/NotFoundPage.tsx` | `/404` | Không gọi API | Static. |
| `pages/ForbiddenPage.tsx` | `/403` | Không gọi API | Static. |

## B. Auth

| Page component | Route | API sử dụng | Ghi chú |
|---|---|---|---|
| `pages/auth/LoginPage.tsx` | `/login` | `POST /auth/login` | Thành công → lưu token qua `axiosClient` (`setAccessToken`), redirect theo `?redirect=` hoặc `/`. |
| `pages/auth/RegisterPage.tsx` | `/register` | `POST /auth/register` | Submit xong hiện modal "kiểm tra email kích hoạt" — modal không gọi thêm API. |
| `pages/auth/ActivateAccountPage.tsx` | `/activate?token=` | `GET /auth/activate?token=` | Gọi ngay khi mount (đọc `token` từ query). Xong → redirect `/login` + toast. |
| `pages/auth/ForgotPasswordPage.tsx` | `/forgot-password` | `POST /auth/forgot-password` | |
| `pages/auth/ResetPasswordPage.tsx` | `/reset-password?token=` | `POST /auth/reset-password` | Đọc `token` từ query, gửi kèm trong body. Xong → redirect `/login` + toast. |

## C. Rooms (public/user)

| Page component | Route | API sử dụng | Ghi chú |
|---|---|---|---|
| `pages/rooms/RoomListPage.tsx` | `/rooms` | `GET /rooms` (mặc định) **hoặc** `GET /rooms/available` (khi user đã nhập `checkIn`/`checkOut`) | 2 API cho cùng 1 màn — chọn API theo việc query có `checkIn`/`checkOut` hay không. |
| `pages/rooms/RoomDetailPage.tsx` | `/rooms/:roomId` | `GET /rooms/:id` + `GET /rooms/:id/reviews` 🚧 (optional) | Nút "Đặt phòng" điều hướng sang `BookRoomPage`, không gọi API ở đây. |
| `pages/rooms/BookRoomPage.tsx` | `/rooms/:roomId/book` | `POST /bookings` | Bắt riêng lỗi `409 Conflict` (race condition) theo `backend/docs/DANH_SACH_API.md`. |

## D. Profile (user)

| Page component | Route | API sử dụng | Ghi chú |
|---|---|---|---|
| `pages/profile/ProfilePage.tsx` | `/profile` | `GET /users/me`, `PATCH /users/me`, `POST /users/me/avatar`, `DELETE /users/me/avatar` 🚧 | Phần avatar (thêm/thay/xoá) nằm chung trang, không tách route. |
| `pages/profile/ChangePasswordPage.tsx` | `/profile/change-password` | `PATCH /users/me/password` | Khác `ResetPasswordPage` — form này cần nhập mật khẩu cũ. |

## E. Bookings (user)

| Page component | Route | API sử dụng | Ghi chú |
|---|---|---|---|
| `pages/bookings/BookingHistoryPage.tsx` | `/bookings` | `GET /bookings/me` | |
| `pages/bookings/BookingDetailPage.tsx` | `/bookings/:bookingId` | `GET /bookings/:id`, `PATCH /bookings/:id` (sửa), `PATCH /bookings/:id/cancel` (huỷ, qua modal) | Nút "Viết đánh giá" điều hướng sang `BookingReviewPage`, nút "Thanh toán" điều hướng sang `BookingPaymentPage`. |
| `pages/bookings/BookingPaymentPage.tsx` | `/bookings/:bookingId/payment` | `POST /bookings/:id/pay` *(stub — BE chưa làm thật)* | Để UI placeholder/disabled, chưa cần xử lý response thật. |
| `pages/bookings/BookingReviewPage.tsx` | `/bookings/:bookingId/review` | `POST /reviews` | Chỉ hiện nút dẫn tới trang này khi booking đã/đang ở (check ở `BookingDetailPage`). |

## F. Admin — Users

| Page component | Route | API sử dụng | Ghi chú |
|---|---|---|---|
| `pages/admin/users/AdminUserListPage.tsx` | `/admin/users` | `GET /admin/users` | |
| `pages/admin/users/AdminUserDetailPage.tsx` | `/admin/users/:userId` | `GET /admin/users/:id`, `PATCH /admin/users/:id/status` | Nút active/inactive gọi ngay tại trang chi tiết. |

## G. Admin — Rooms

| Page component | Route | API sử dụng | Ghi chú |
|---|---|---|---|
| `pages/admin/rooms/AdminRoomListPage.tsx` | `/admin/rooms` | `GET /admin/rooms`, `DELETE /admin/rooms/:id` (popup xoá theo dòng), `GET /admin/rooms/export` 🚧 | |
| `pages/admin/rooms/AdminRoomDetailPage.tsx` | `/admin/rooms/:roomId` | `GET /admin/rooms/:id` | |
| `pages/admin/rooms/AdminRoomCreatePage.tsx` | `/admin/rooms/new` | `POST /admin/rooms` | |
| `pages/admin/rooms/AdminRoomEditPage.tsx` | `/admin/rooms/:roomId/edit` | `GET /admin/rooms/:id` (load form) + `PATCH /admin/rooms/:id` | |

## H. Admin — Bookings

| Page component | Route | API sử dụng | Ghi chú |
|---|---|---|---|
| `pages/admin/bookings/AdminBookingListPage.tsx` | `/admin/bookings` | `GET /admin/bookings` 🚧 | |
| `pages/admin/bookings/AdminBookingDetailPage.tsx` | `/admin/bookings/:bookingId` | `GET /admin/bookings/:id` 🚧, `PATCH /admin/bookings/:id/accept` 🚧, `PATCH /admin/bookings/:id/reject` 🚧 | 2 nút Chấp nhận/Từ chối cùng nằm trang này, không route riêng. |

## I. Admin — Reviews

| Page component | Route | API sử dụng | Ghi chú |
|---|---|---|---|
| `pages/admin/reviews/AdminReviewListPage.tsx` | `/admin/reviews` | `GET /admin/reviews` 🚧, `DELETE /admin/reviews/:id` (popup xoá theo dòng) | Xoá xong BE tự trigger email `ReviewDeleted`, FE không cần gọi thêm gì. |

## J. Admin — Statistics

| Page component | Route | API sử dụng | Ghi chú |
|---|---|---|---|
| `pages/admin/statistics/AdminBookingStatsPage.tsx` | `/admin/statistics/bookings` | `GET /admin/statistics/bookings` | Tab con của layout Statistics. |
| `pages/admin/statistics/AdminRevenueStatsPage.tsx` | `/admin/statistics/revenue` | `GET /admin/statistics/revenue` | Tab con của layout Statistics. |

## K. Admin — Email Log

| Page component | Route | API sử dụng | Ghi chú |
|---|---|---|---|
| `pages/admin/email-logs/AdminEmailLogListPage.tsx` | `/admin/email-logs` | `GET /admin/email-logs` | Filter theo `PENDING/SENT/FAILED` qua query param. |
| `pages/admin/email-logs/AdminEmailLogDetailPage.tsx` | `/admin/email-logs/:logId` | `GET /admin/email-logs/:id`, `POST /admin/email-logs/:id/retry` | Nút "Gửi lại" chỉ hiện khi status `FAILED`. |

## L. Admin — Dashboard

| Page component | Route | API sử dụng | Ghi chú |
|---|---|---|---|
| `pages/admin/AdminDashboardPage.tsx` | `/admin` | Không bắt buộc | Có thể gọi rút gọn `GET /admin/statistics/bookings` + `GET /admin/statistics/revenue` để hiện vài số liệu tổng quan, không phải yêu cầu gốc. |

---

## Modal/action không có page riêng (gọi API từ trang cha)

| Hành động | Trang chứa | API |
|---|---|---|
| Huỷ booking (lý do tuỳ chọn) | `BookingDetailPage` | `PATCH /bookings/:id/cancel` |
| Quên mật khẩu (nếu làm modal thay vì trang riêng) | `LoginPage` hoặc `ForgotPasswordPage` | `POST /auth/forgot-password` |
| Xoá phòng | `AdminRoomListPage` (hoặc `AdminRoomDetailPage` nếu thêm nút ở đó) | `DELETE /admin/rooms/:id` |
| Xoá đánh giá | `AdminReviewListPage` | `DELETE /admin/reviews/:id` |
| Từ chối booking (kèm lý do) | `AdminBookingDetailPage` | `PATCH /admin/bookings/:id/reject` |

## Đối chiếu nhanh: API chưa dùng ở màn nào

Toàn bộ endpoint trong `backend/docs/DANH_SACH_API.md` đều đã được gán vào
đúng 1 màn hình ở trên — không có API nào dư/không nơi dùng. Riêng API tuỳ
chọn `GET /rooms/:id/reviews` (đánh dấu optional ở doc BE) nếu team quyết
định không làm, thì bỏ luôn dòng review-listing trong `RoomDetailPage`
(không ảnh hưởng các màn khác).
