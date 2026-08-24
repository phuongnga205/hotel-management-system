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
| `pages/rooms/RoomDetailPage.tsx` | `/rooms/:roomId` | `GET /rooms/:id` + `GET /rooms/:roomId/reviews` | Nút "Đặt phòng" điều hướng sang `BookRoomPage`, không gọi API ở đây. **🆕 TODO**: `GET /rooms/:roomId/reviews` đã implement ở BE (public, không cần JWT — xem `backend/docs/DANH_SACH_API.md` mục 5, `frontend/docs/bridge.md` mục 8) nhưng trang này **chưa gọi** — cần thêm phần hiển thị danh sách đánh giá (phân trang) qua `reviewApi.listByRoom(roomId, query)` (đã có sẵn ở `frontend/src/api/review.api.ts`). |
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
| `pages/bookings/BookingPaymentPage.tsx` | `/bookings/:bookingId/payment` | `POST /bookings/:id/pay` | BE đã implement (mock — luôn thành công ngay, không phải cổng thanh toán thật): màn hình chỉ cần cho chọn `method` rồi gọi API 1 lần, không cần polling/callback. `bookingApi.pay()` + mock đã có sẵn ở `frontend/src/api/booking.api.ts`, trang này vẫn **chưa được dựng**. |
| `pages/bookings/BookingReviewPage.tsx` | `/bookings/:bookingId/review` | `POST /reviews` | Chỉ hiện nút dẫn tới trang này khi booking đã/đang ở (check ở `BookingDetailPage`). |
| 🚧 `pages/payments/PaymentHistoryPage.tsx` | `/payments` | `GET /payments/me` (BE đã implement, xem `backend/docs/DANH_SACH_API.md` mục 4a) | **TODO — FE chưa dựng, để session sau** (API đã sẵn sàng dùng ngay). Trang riêng liệt kê toàn bộ lịch sử thanh toán của user hiện tại (mọi booking gộp lại), nằm trong thư mục `pages/payments/` (ngang hàng `pages/bookings/`), không phải tab/section trong `BookingDetailPage`. Có nút/link dẫn tới đây từ `BookingHistoryPage` hoặc menu tài khoản. |

## F. Admin — Users

| Page component | Route | API sử dụng | Ghi chú |
|---|---|---|---|
| `pages/admin/users/AdminUserListPage.tsx` | `/admin/users` | `GET /admin/users` | |
| `pages/admin/users/AdminUserDetailPage.tsx` | `/admin/users/:userId` | `GET /admin/users/:id`, `PATCH /admin/users/:id` | Nút active/inactive gọi ngay tại trang chi tiết, gửi `PATCH /admin/users/:id` với body `{ "status": "..." }` — **không phải** route con `.../status` (route đó không tồn tại, BE dùng chung 1 endpoint PATCH cho mọi field). |

> 🆕 **Optional, chưa có UI** — BE đã implement sẵn `POST /admin/users`
> (tạo user, kích hoạt ngay) và `DELETE /admin/users/:id` (xoá mềm), xem
> `backend/docs/DANH_SACH_API.md` mục 8. Chưa có trang/route FE nào gọi 2 API
> này; làm khi cần, ví dụ nút "Tạo người dùng" trên `AdminUserListPage` và
> nút "Xoá" trên `AdminUserDetailPage`.

## G. Admin — Rooms

| Page component | Route | API sử dụng | Ghi chú |
|---|---|---|---|
| `pages/admin/rooms/AdminRoomListPage.tsx` | `/admin/rooms` | `GET /admin/rooms`, `DELETE /admin/rooms/:id` (popup xoá theo dòng), `GET /admin/rooms/export` 🚧 | |
| `pages/admin/rooms/AdminRoomDetailPage.tsx` | `/admin/rooms/:roomId` | `GET /admin/rooms/:id` | `room.amenities`/`room.images` trả kèm trong response, không cần gọi API riêng để hiển thị. |
| `pages/admin/rooms/AdminRoomCreatePage.tsx` | `/admin/rooms/new` | `POST /admin/rooms`, `GET /amenities` (nạp danh sách tiện nghi cho phần chọn gán) | |
| `pages/admin/rooms/AdminRoomEditPage.tsx` | `/admin/rooms/:roomId/edit` | `GET /admin/rooms/:id` (load form), `PATCH /admin/rooms/:id`, `GET /amenities` + `POST /admin/rooms/:id/amenities` + `DELETE /admin/rooms/:id/amenities/:amenityId` (gán/gỡ tiện nghi), `POST /admin/rooms/:id/images` + `DELETE /admin/rooms/:id/images/:imageId` (đổi ảnh đại diện — xem quy ước 1-ảnh/phòng ở `frontend/docs/bridge.md` mục 4) | |

## G2. Admin — Amenities

| Page component | Route | API sử dụng | Ghi chú |
|---|---|---|---|
| `pages/admin/amenities/AdminAmenityListPage.tsx` | `/admin/amenities` | `GET /amenities`, `POST /amenities` (tạo, qua modal), `PATCH /amenities/:id` (sửa, qua modal), `DELETE /amenities/:id` (xoá, popup xác nhận) | Danh sách đơn giản (tên + mô tả), không cần trang chi tiết/route con riêng — tạo/sửa dùng modal trên cùng trang, giống pattern `ConfirmModal` đã dùng ở các trang admin khác. |

## H. Admin — Bookings

| Page component | Route | API sử dụng | Ghi chú |
|---|---|---|---|
| `pages/admin/bookings/AdminBookingListPage.tsx` | `/admin/bookings` | `GET /admin/bookings` | Đã có cột "Payment" (dùng lại `PaymentBadge`) bên cạnh cột "Status" — hiện cả booking status lẫn payment status. |
| `pages/admin/bookings/AdminBookingDetailPage.tsx` | `/admin/bookings/:bookingId` | `GET /admin/bookings/:id`, `PATCH /admin/bookings/:id/accept`, `PATCH /admin/bookings/:id/reject` | 2 nút Chấp nhận/Từ chối cùng nằm trang này, không route riêng. Đã hiện cả `StatusBadge` (booking) lẫn `PaymentBadge` (payment). |

## I. Admin — Reviews

| Page component | Route | API sử dụng | Ghi chú |
|---|---|---|---|
| `pages/admin/reviews/AdminReviewListPage.tsx` | `/admin/reviews` | `GET /admin/reviews` 🚧, `DELETE /admin/reviews/:id` (popup xoá theo dòng) | Xoá xong BE tự trigger email `ReviewDeleted`, FE không cần gọi thêm gì. |

## J. Admin — Statistics

| Page component | Route | API sử dụng | Ghi chú |
|---|---|---|---|
| `pages/admin/statistics/AdminBookingStatsPage.tsx` | `/admin/statistics/bookings` | `GET /admin/statistics/bookings` | Tab con của layout Statistics. |
| `pages/admin/statistics/AdminRevenueStatsPage.tsx` | `/admin/statistics/revenue` | `GET /admin/statistics/revenue`, `GET /admin/payments` | Tab con của layout Statistics. Ngoài các chart doanh thu, có thêm bảng "Transactions" (`AdminTable`) liệt kê từng giao dịch thanh toán — filter theo `status`/`method` (2 `Dropdown`), phân trang bằng `Pagination` riêng với phần chart phía trên (không share state `page`). Bảng chỉ hiện ít cột (booking, khách, phòng, số tiền, trạng thái) để đỡ chật — bấm vào 1 dòng mở `PaymentDetailModal` (`components/admin/PaymentDetailModal.tsx`) xem đầy đủ thông tin (kèm phương thức, mã giao dịch, thời gian thanh toán/tạo). Không có route/trang riêng cho bảng này — nằm chung `AdminRevenueStatsPage`. |

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
đúng 1 màn hình ở trên — không có API nào dư/không nơi dùng.

> 🆕 **TODO**: `GET /rooms/:roomId/reviews` (mục C, `RoomDetailPage`) —
> không còn là API tuỳ chọn, **đã implement xong ở BE** (public, không cần
> JWT). Chỉ còn thiếu phần FE gọi API này trong `RoomDetailPage`.

`GET /payments/me` (mục 4a ở doc BE) đã implement ở BE, nhưng FE chưa dựng
trang gọi tới — TODO duy nhất còn treo, gắn với trang
`PaymentHistoryPage.tsx` (`/payments`) ở mục E, để lại cho session sau.

> 🆕 Mục G/G2 (Rooms/Amenities) mô tả theo thiết kế đã chốt ở 1 nhánh git
> riêng chưa merge — xem cảnh báo đầu `backend/docs/DANH_SACH_API.md` và
> `frontend/docs/bridge.md`.
