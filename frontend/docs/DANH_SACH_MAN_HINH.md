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
| `pages/HomePage.tsx` | `/` | `GET /rooms` (phòng nổi bật) + `GET /rooms/:roomId/reviews` (carousel đánh giá) | ✅ Trang gọi `roomApi.listPublic({page:1, limit: FEATURED_ROOM_COUNT})` rồi `reviewApi.listByRoom()` cho từng phòng nổi bật để dựng carousel review. Các nút điều hướng (thanh search, "View all rooms", card phòng → "Đặt phòng"/"Xem chi tiết") trỏ tới `/rooms`, `/rooms/:roomId`, `/rooms/:roomId/book` — cả 3 route này **đã dựng** (mục C), không còn dead link. |
| `pages/NotFoundPage.tsx` | `/404` | Không gọi API | ✅ Đã dựng, route fallback `path: '*'` đăng ký trong `router/index.tsx`. Text qua i18n (`common.notFound.*`), CTA dùng lại class `.btn-primary` chung. |
| `pages/ForbiddenPage.tsx` | `/403` | Không gọi API | ✅ Đã dựng, route `ROUTES.FORBIDDEN` đăng ký thật. `AdminGuard` đã sửa redirect đúng `/403` thay vì `/`. Text qua i18n (`common.forbidden.*`), interpolate tên thương hiệu qua `common.app.name` thay vì hardcode "Grandeur". |

## B. Auth

| Page component | Route | API sử dụng | Ghi chú |
|---|---|---|---|
| `pages/auth/LoginPage.tsx` | `/login` | `POST /auth/login` | Thành công → lưu token qua `axiosClient` (`setAccessToken`), redirect theo `?redirect=` hoặc `/`. ⚠️ Tên file thật là `LoginPage.tsx` export `{ LoginPage }` (named export, không phải default) — khớp cột này, chỉ ghi chú vì các trang admin dùng default export, khác convention. |
| `pages/auth/RegisterPage.tsx` | `/register` | `POST /auth/register` | Submit xong hiện modal "kiểm tra email kích hoạt" — modal không gọi thêm API. |
| `pages/auth/ActivatePage.tsx` | `/activate?email=` | `POST /auth/activate` (body `{ email, otp }`) | 🆕⚠️ **Đã lỗi thời — sửa lại theo OTP đã chốt** (dòng cũ ghi `ActivateAccountPage.tsx`, `/activate?token=`, `GET /auth/activate?token=` — kiểu link/token cũ không còn dùng, xem `frontend/docs/CAU_TRUC_ROUTE.md` mục "Quy ước chung"). Tên file thật cũng khác: `ActivatePage.tsx`, không phải `ActivateAccountPage.tsx`. Form nhập **email + mã OTP 6 số** (gửi qua email), `?email=` chỉ để prefill. Xong → redirect `/login` + toast. **BE hiện chưa implement `POST /auth/activate` thật** (chỉ có hợp đồng API, xem `backend/docs/DANH_SACH_API.md` mục 1) — trang gọi API này sẽ nhận lỗi khi tắt mock. |
| `pages/auth/ForgotPasswordPage.tsx` | `/forgot-password` | `POST /auth/forgot-password` | 🚧 BE hiện chưa implement thật (chỉ có hợp đồng API, mục 1). |
| `pages/auth/ResetPasswordPage.tsx` | `/reset-password?email=` | `POST /auth/reset-password` (body `{ email, otp, newPassword }`) | 🆕⚠️ **Đã lỗi thời, tương tự dòng trên** — dòng cũ ghi `?token=`, đã đổi sang OTP: đọc `email` từ query (chỉ prefill), user gõ tay `otp` + mật khẩu mới. Xong → redirect `/login` + toast. 🚧 BE hiện chưa implement thật. |

## C. Rooms (public/user)

| Page component | Route | API sử dụng | Ghi chú |
|---|---|---|---|
| `pages/rooms/RoomListPage.tsx` | `/rooms` | `GET /rooms` (mặc định, qua `roomApi.listPublic()`) **hoặc** `GET /rooms/available` (khi user đã nhập `checkIn`/`checkOut`, qua `roomApi.listAvailable()`) | ✅ **Đã dựng.** Chọn API theo việc query có `checkIn`/`checkOut` hay không, cả 2 nhận thêm `guests` (optional). Có filter giá + tiện nghi (chỉ gửi lên server ở nhánh `listAvailable`, đúng theo `ListAvailableRoomsQuery`) và filter `roomType`/`viewType` — 2 field này chưa có param lọc server nên đang lọc **client-side** trên tập dữ liệu trang hiện tại (danh sách lựa chọn lấy `distinct` động, không hardcode). Giữ nguyên `checkIn`/`checkOut`/`guests` trên URL khi điều hướng sang `RoomDetailPage`/`BookRoomPage`. |
| `pages/rooms/RoomDetailPage.tsx` | `/rooms/:roomId` | `GET /rooms/:id` + `GET /rooms/:roomId/reviews` | ✅ **Đã dựng.** Nút "Đặt phòng" điều hướng sang `BookRoomPage` (chưa đăng nhập → `/login?redirect=`), không gọi API ở đây. Hiển thị `room.capacity` dạng "up to N guests" qua `common:roomCard.upToGuests`. Đọc lại `?checkIn=&checkOut=&guests=` từ URL (nếu có) và giữ nguyên khi bấm "Đặt phòng". |
| `pages/rooms/BookRoomPage.tsx` | `/rooms/:roomId/book` | `POST /bookings` — body bắt buộc có `guests` | ✅ **Đã dựng.** Bắt riêng lỗi `409 Conflict` (race condition). Form có input chọn số khách (`guests`), validate client-side `<= room.capacity` trước khi submit, hiển thị `totalPrice` ước tính = `nights × pricePerNight × guests` trước khi bấm đặt. Prefill từ `?checkIn=&checkOut=&guests=` nếu có trên URL (vẫn cho sửa), mặc định `guests: 1` + ngày trống nếu vào thẳng không qua search. |

## D. Profile (user)

| Page component | Route | API sử dụng | Ghi chú |
|---|---|---|---|
| `pages/profile/ProfilePage.tsx` | `/profile` | `GET /users/me`, `PATCH /users/me`, `POST`/`DELETE /users/me/avatar` | ✅ Đã dựng đầy đủ, có route thật. Khu vực avatar: nút "Change Avatar" (file picker ẩn, validate type/size client-side qua `constants/avatar.ts` trước khi gọi `userApi.uploadAvatar()`) + "Remove Avatar" (chỉ hiện khi đã có avatar, `userApi.removeAvatar()`) — cả 2 gọi `refreshUser()` (`useAuth()`) sau khi xong để avatar trên `Header.tsx` cập nhật ngay. |
| ~~`pages/profile/ChangePasswordPage.tsx`~~ | ~~`/profile/change-password`~~ | `PATCH /users/me/password` | ⛔ **Đã quyết định KHÔNG làm route riêng** — trùng chức năng với tab "Security" đã có sẵn trong `ProfilePage.tsx` (cũng gọi `userApi.changePassword()`, chạy thật). File stub đã bị xoá khỏi `pages/profile/`. |

## E. Bookings (user)

| Page component | Route | API sử dụng | Ghi chú |
|---|---|---|---|
| `pages/bookings/BookingHistoryPage.tsx` | `/bookings` | `GET /bookings/me`, `PATCH /bookings/:id` (sửa, qua modal), `PATCH /bookings/:id/cancel` (huỷ, qua modal) | ✅ Đã dựng, có route thật. **Khác thiết kế gốc**: không có trang `BookingDetailPage` riêng — action Sửa/Huỷ đã gộp thẳng vào đây qua `EditBookingModal`/`CancelBookingModal` (`src/components/bookings/`), mở ngay từ card trong list. Nút "Pay" trên mỗi card (`BookingCard`, `onPay` → `handlePay`) navigate tới `/bookings/:id/payment` — route này **đã dựng** (xem dòng `BookingPaymentPage` bên dưới), không còn là dead link. `BookingCard` giờ hiện nút "Pay" đúng cả 2 tình huống hợp lệ (mục 4 `DANH_SACH_API.md`): PENDING + hold còn hạn (kèm đồng hồ đếm ngược `HoldCountdown`, viền vàng "urgency" — hold suy ra từ `booking.createdAt + BOOKING_HOLD_MINUTES`, xem `constants/booking.ts`, KHÔNG có field `holdExpiresAt` trả về từ API) hoặc ACCEPTED + chưa có payment SUCCESS ("trả bù"). Có thêm nút "Viết đánh giá" khi booking ACCEPTED + đã thanh toán + qua `checkOutDate` (`onReview` → `BookingReviewPage`). |
| `pages/bookings/BookingDetailPage.tsx` | `/bookings/:bookingId` | `GET /bookings/:id`, `PATCH /bookings/:id` (sửa), `PATCH /bookings/:id/cancel` (huỷ, qua modal) | 🚧 **CHƯA DỰNG, và có thể sẽ KHÔNG cần dựng nữa** — thiết kế thực tế hiện tại (`BookingHistoryPage.tsx`) đã gộp toàn bộ action sửa/huỷ vào thẳng list qua modal (xem dòng trên), không drill-down vào trang chi tiết riêng. Cân nhắc xoá hẳn dòng này khỏi tài liệu nếu team chốt giữ pattern hiện tại, thay vì để treo như 1 gap cần làm. |
| `pages/bookings/BookingPaymentPage.tsx` | `/bookings/:bookingId/payment` | `POST /bookings/:id/pay` | ✅ **Đã dựng**, route đăng ký trong nhánh `AuthGuard`. Chọn method (`CASH`/`BANK_TRANSFER`/`CREDIT_CARD`/`VNPAY`) qua `PaymentMethodSelector`, gọi `bookingApi.pay()`, bắt riêng lỗi 409 Conflict. Nút "Pay" ở `BookingHistoryPage`/`BookingCard` không còn là dead link. |
| `pages/bookings/BookingReviewPage.tsx` | `/bookings/:bookingId/review` | `POST /reviews` | ✅ **Đã dựng**, route đăng ký trong nhánh `AuthGuard`. Nút "Viết đánh giá" đã thêm vào `BookingCard.tsx` (`onReview`), chỉ hiện khi đủ điều kiện (khớp đúng `ReviewsService.create()` ở BE: ACCEPTED + có payment SUCCESS + qua `checkOutDate`). Trang tự kiểm tra lại điều kiện này lần nữa (phòng trường hợp vào thẳng URL) trước khi hiện form; bắt riêng 409 (đã review rồi) và 400 (chưa đủ điều kiện) qua `getErrorStatusCode()`. `StarRating.tsx` được mở rộng thêm prop `onChange` (tương thích ngược) để dùng làm star-picker ở đây, không tạo component sao riêng. |
| `pages/payments/PaymentHistoryPage.tsx` | `/payments` | `GET /payments/me` | ✅ **Đã dựng**, route đăng ký trong nhánh `AuthGuard`. Liệt kê toàn bộ lịch sử thanh toán của user hiện tại (mọi booking gộp lại) qua `paymentApi.listMine()`, filter theo `status`/`method` (2 `Dropdown`, tái dùng label từ `admin.json` — `status.payment.*`/`status.paymentMethod.*` — thay vì định nghĩa lại), badge trạng thái tái dùng `components/PaymentBadge.tsx`. Không có link riêng trên thanh nav — truy cập qua mục "Payment History" trong dropdown profile (`Header.tsx`), **chỉ hiện với user thường** (ẩn với admin, xem mục "Auth/role" bên dưới). Mock (`payment.mock.ts`) đọc trực tiếp từ `bookings` (booking.mock.ts) thay vì 1 fixture tĩnh riêng, để phản ánh đúng hành động thật trong phiên (vừa trả tiền 1 booking → thấy ngay ở đây). |

## E2. Reviews (user)

| Page component | Route | API sử dụng | Ghi chú |
|---|---|---|---|
| `pages/reviews/MyReviewsPage.tsx` | `/reviews` | `GET /reviews/me` | ✅ **Đã dựng**, route đăng ký trong nhánh `AuthGuard`, thêm nút nav "My Reviews" trong `Header.tsx` ngang hàng "My Bookings". Liệt kê toàn bộ đánh giá user hiện tại đã viết, gộp từ mọi phòng — dùng endpoint self-service riêng (`GET /reviews/me`, BE mới thêm) thay vì FE tự ghép từ `GET /bookings/me` + gọi `GET /rooms/:roomId/reviews` cho từng phòng khác nhau (N+1, không cần thiết khi đã có API đúng chuẩn `*/me`). Response kèm sẵn `room` summary (tên/ảnh) nên không cần gọi thêm request nào khác. |

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
| `pages/admin/statistics/AdminBookingStatsPage.tsx` | `/admin/statistics/bookings` | `GET /statistics/revenue-bookings` | Tab con của layout Statistics. Có bộ chọn kỳ (`StatisticsPeriodControls`: `period` DAY/MONTH/QUARTER, `year`, `month` khi period=DAY) — đổi giá trị gọi lại API với query mới. |
| `pages/admin/statistics/AdminRevenueStatsPage.tsx` | `/admin/statistics/revenue` | `GET /statistics/revenue-bookings`, `GET /admin/payments` | Tab con của layout Statistics, cùng bộ chọn kỳ như trên (state riêng, không share với `AdminBookingStatsPage`). Ngoài chart doanh thu, có thêm bảng "Transactions" (`AdminTable`) liệt kê từng giao dịch thanh toán — filter theo `status`/`method` (2 `Dropdown`), phân trang bằng `Pagination` riêng với phần chart phía trên (không share state `page`). Bảng chỉ hiện ít cột (booking, khách, phòng, số tiền, trạng thái) để đỡ chật — bấm vào 1 dòng mở `PaymentDetailModal` (`components/admin/PaymentDetailModal.tsx`) xem đầy đủ thông tin (kèm phương thức, mã giao dịch, thời gian thanh toán/tạo). Không có route/trang riêng cho bảng này — nằm chung `AdminRevenueStatsPage`. |

> **Đã khớp đúng response BE thật** (`StatisticsModule`, xem
> `backend/docs/DANH_SACH_API.md` mục 11) — 1 route gộp
> `GET /statistics/revenue-bookings?period=DAY|MONTH|QUARTER&year=&month=`,
> trả cả tổng doanh thu lẫn tổng số booking cùng lúc, không có breakdown
> theo `roomType`/`status`. Vì vậy 2 chart cũ dựa trên breakdown đó (status
> pie ở trang booking, room-type bar ở trang revenue) đã bỏ, thay bằng chart
> dựng từ `buckets` (số booking/doanh thu theo từng mốc thời gian trong kỳ
> đã chọn) — component chọn kỳ dùng chung:
> `components/admin/StatisticsPeriodControls.tsx`. Type khớp response thật:
> `RevenueBookingsStatistics`/`StatisticsQuery`/`StatisticsBucket`
> (`frontend/src/api/types.ts`), mock sinh `buckets` theo đúng query
> (`frontend/src/api/mocks/statistics.mock.ts`).

## K. Admin — Email Log

| Page component | Route | API sử dụng | Ghi chú |
|---|---|---|---|
| `pages/admin/email-logs/AdminEmailLogListPage.tsx` | `/admin/email-logs` | `GET /admin/email-logs` | Filter theo `PENDING/SENT/FAILED` qua query param. |
| `pages/admin/email-logs/AdminEmailLogDetailPage.tsx` | `/admin/email-logs/:logId` | `GET /admin/email-logs/:id`, `POST /admin/email-logs/:id/retry` | Nút "Gửi lại" chỉ hiện khi status `FAILED`. |

## L. Admin — Dashboard

| Page component | Route | API sử dụng | Ghi chú |
|---|---|---|---|
| `pages/admin/AdminDashboardPage.tsx` | `/admin` | Không bắt buộc | Có thể gọi rút gọn `GET /statistics/revenue-bookings` để hiện vài số liệu tổng quan, không phải yêu cầu gốc. |

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

> ⚠️ **Đã cập nhật sau khi đối chiếu lại với code thật** (trước đây ghi
> "không có API nào dư/không nơi dùng" — không còn đúng, xem danh sách bên
> dưới).

- `GET /rooms/:roomId/reviews` — đã dùng ở cả `HomePage.tsx` (carousel) và
  `RoomDetailPage.tsx` (danh sách đánh giá của phòng).
- `GET /payments/me` — đã tiêu thụ trong `PaymentHistoryPage.tsx` qua
  `paymentApi.listMine()` (mới thêm cùng `adminList()`).
- `POST`/`DELETE /users/me/avatar` — đã tiêu thụ trong `ProfilePage.tsx`
  qua `userApi.uploadAvatar()`/`removeAvatar()` (mục D).
- `POST /auth/logout` — đã implement ở BE từ trước nhưng FE chưa từng gọi
  (bug: chỉ `clearAccessToken()` phía client) — đã sửa, `Header.tsx`/
  `AdminLayout.tsx` giờ gọi `authApi.logout()` trước khi xoá token cục bộ.
- `POST /bookings/:id/pay` — đã có method thật (`bookingApi.pay()`), đã có
  entry point (nút "Pay" ở `BookingHistoryPage`) **và trang đích
  `BookingPaymentPage` đã dựng xong** (mục E) — không còn dead link.
- `POST /reviews` — đã tiêu thụ trong `BookingReviewPage.tsx`
  (`reviewApi.create()`), nút "Viết đánh giá" trên `BookingCard` dẫn vào.
- `GET /reviews/me` — đã tiêu thụ trong `MyReviewsPage.tsx`
  (`reviewApi.listMine()`, mục E2), endpoint BE mới thêm.
- `GET /rooms/available` (`roomApi.listAvailable()`) và `guests` query trên
  cả `GET /rooms`/`GET /rooms/available` — đã tiêu thụ trong
  `RoomListPage.tsx`.
- `guests` trên `Booking`/`CreateBookingPayload` (`api/types.ts`) — đã
  tiêu thụ trong `BookRoomPage.tsx`.
- `POST /mail/test`, `GET /mail/:id` (mục 12a ở doc BE) — route dev/test
  nội bộ, không guard, **không map vào màn hình FE nào cả theo thiết kế**
  (không thuộc luồng nghiệp vụ chính thức) — khác các API "thiếu UI" khác ở
  trên, đây là **cố ý không có UI**.

> ✅ Mục G/G2 (Rooms/Amenities) **đã merge xong** — không còn là thiết kế ở
> nhánh git riêng như ghi chú cũ. `AdminRoomsController` hiện có đủ cả
> `PATCH .../price`, `POST`/`DELETE .../amenities` (xem
> `backend/docs/DANH_SACH_API.md` mục 6), khớp đúng API mà `AdminRoomEditPage`
> (mục G) đang gọi.
