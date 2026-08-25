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
| `pages/HomePage.tsx` | `/` | `GET /rooms` (phòng nổi bật) + `GET /rooms/:roomId/reviews` (carousel đánh giá) | ✅ **Đã vượt mô tả gốc** — không chỉ "có thể gọi", trang đã thật sự gọi `roomApi.listPublic({page:1, limit: FEATURED_ROOM_COUNT})` rồi `reviewApi.listByRoom()` cho từng phòng nổi bật để dựng carousel review. **Nhưng các nút điều hướng trên trang này (thanh search, "View all rooms", card phòng → "Đặt phòng"/"Xem chi tiết") đều trỏ tới `/rooms`, `/rooms/:roomId`, `/rooms/:roomId/book` — cả 3 route này CHƯA tồn tại (mục C bên dưới), nên hiện là dead link khi click.** |
| `pages/NotFoundPage.tsx` | `/404` | Không gọi API | ✅ Đã dựng, route fallback `path: '*'` đăng ký trong `router/index.tsx`. Text qua i18n (`common.notFound.*`), CTA dùng lại class `.btn-primary` chung. |
| `pages/ForbiddenPage.tsx` | `/403` | Không gọi API | ✅ Đã dựng, route `ROUTES.FORBIDDEN` đăng ký thật. `AdminGuard` đã sửa redirect đúng `/403` thay vì `/`. Text qua i18n (`common.forbidden.*`), interpolate tên thương hiệu qua `common.app.name` thay vì hardcode "Grandeur". |

## B. Auth

| Page component | Route | API sử dụng | Ghi chú |
|---|---|---|---|
| `pages/auth/LoginPage.tsx` | `/login` | `POST /auth/login` | Thành công → lưu token qua `axiosClient` (`setAccessToken`), redirect theo `?redirect=` hoặc `/`. ⚠️ Tên file thật là `LoginPage.tsx` export `{ LoginPage }` (named export, không phải default) — khớp cột này, chỉ ghi chú vì các trang admin dùng default export, khác convention. |
| `pages/auth/RegisterPage.tsx` | `/register` | `POST /auth/register` | Submit xong hiện modal "kiểm tra email kích hoạt" — modal không gọi thêm API. |
| `pages/auth/ActivatePage.tsx` | `/activate?email=` | `POST /auth/activate` (body `{ email, otp }`) | Form nhập email + OTP 6 số, `?email=` chỉ để prefill. BE đã implement endpoint thật; thành công redirect `/login`. |
| `pages/auth/ForgotPasswordPage.tsx` | `/forgot-password` | `POST /auth/forgot-password` | BE luôn trả cùng response dù email tồn tại hay không để chống dò tài khoản. |
| `pages/auth/ResetPasswordPage.tsx` | `/reset-password?email=` | `POST /auth/reset-password` (body `{ email, otp, newPassword }`) | OTP lưu Redis có TTL; thành công redirect `/login`. |

## C. Rooms (public/user)

| Page component | Route | API sử dụng | Ghi chú |
|---|---|---|---|
| `pages/rooms/RoomListPage.tsx` | `/rooms` | `GET /rooms` (mặc định, qua `roomApi.listPublic()`) **hoặc** `GET /rooms/available` (khi user đã nhập `checkIn`/`checkOut`, qua `roomApi.listAvailable()` 🆕) | 🚧 **CHƯA DỰNG — file/route chưa tồn tại.** 2 API cho cùng 1 màn — chọn API theo việc query có `checkIn`/`checkOut` hay không. `roomApi.listPublic()` đã sẵn sàng gọi thật (đã được `HomePage.tsx` dùng cho phần "phòng nổi bật"), chỉ thiếu đúng trang này. **`HomePage.tsx` đã có link trỏ tới route này — dead link hiện tại.** 🆕 Cả 2 API giờ nhận thêm `guests` (optional, lọc theo `room.capacity`) — đọc từ query string `?guests=` mà `HomePage.tsx` đã build sẵn (`ListRoomsQuery.guests`/`ListAvailableRoomsQuery.guests`, `api/types.ts`). `roomApi.listAvailable()` trước đây **hoàn toàn chưa tồn tại** (dù `API_ENDPOINTS.ROOMS_AVAILABLE` đã có constant), giờ đã có sẵn để gọi. 🆕 **Mang `checkIn`/`checkOut`/`guests` tiếp xuống `RoomDetailPage`**: khi user bấm vào 1 phòng trong kết quả tìm kiếm, giữ nguyên 3 query này trên URL (`/rooms/:roomId?checkIn=&checkOut=&guests=`) — xem giải thích đầy đủ ở ghi chú `RoomDetailPage`/`BookRoomPage` bên dưới và ở `SO_TAY_MAN_HINH_USER_CON_LAI.md`. |
| `pages/rooms/RoomDetailPage.tsx` | `/rooms/:roomId` | `GET /rooms/:id` + `GET /rooms/:roomId/reviews` | 🚧 **CHƯA DỰNG — file/route chưa tồn tại.** Nút "Đặt phòng" điều hướng sang `BookRoomPage`, không gọi API ở đây. `reviewApi.listByRoom(roomId, query)` đã được chứng minh hoạt động thật (dùng trong `HomePage.tsx` cho carousel đánh giá) — không còn là API "chưa gọi bao giờ", chỉ thiếu trang chi tiết phòng để nối vào. **`HomePage.tsx` đã có nút "Xem chi tiết" trỏ tới route này — dead link hiện tại.** Gợi ý UX (không bắt buộc): hiển thị `room.capacity` dạng "up to N guests", giống cách `RoomCard.tsx` đang hiển thị ở list/home. 🆕 **Đọc lại `?checkIn=&checkOut=&guests=` từ URL (nếu có)** và giữ nguyên khi bấm "Đặt phòng" (`navigate(ROUTES.BOOK_ROOM(roomId) + '?checkIn=...&checkOut=...&guests=...')`) — 2 case: **(a) Đến từ `RoomListPage`/search** → URL có sẵn 3 query này, mang thẳng xuống `BookRoomPage` để prefill form, user không phải gõ lại. **(b) Đến thẳng không qua search** (link "phòng nổi bật" ở `HomePage.tsx`, bookmark, share link) → URL không có query nào, `BookRoomPage` phải tự có default hợp lý (`guests: 1`, chưa chọn ngày) và để user tự điền từ đầu — đây là hành vi hiện tại của `HomePage.tsx` (`onView`/`onBook` navigate trơn, không kèm query). |
| `pages/rooms/BookRoomPage.tsx` | `/rooms/:roomId/book` | `POST /bookings` — **body giờ bắt buộc có `guests`** 🆕 | 🚧 **CHƯA DỰNG — file/route chưa tồn tại.** Bắt riêng lỗi `409 Conflict` (race condition) theo `backend/docs/DANH_SACH_API.md`. `bookingApi.create()` đã sẵn sàng gọi thật. **`HomePage.tsx` đã có nút "Đặt phòng" trỏ tới route này — dead link hiện tại.** 🆕 Form cần input chọn số khách (`guests`), validate client-side `<= room.capacity` trước khi submit (BE vẫn validate lại, 400 `GUESTS_EXCEED_CAPACITY` nếu vượt), và nên hiển thị `totalPrice` ước tính = `nights × pricePerNight × guests` trước khi bấm đặt (khớp công thức BE — xem `bridge.md` mục 6). 🆕 **2 case điền form, đọc `?checkIn=&checkOut=&guests=` từ URL lúc mount**: **(a) Có query (đến từ search/`RoomDetailPage`)** → prefill sẵn `checkInDate`/`checkOutDate`/`guests` từ query, user chỉ cần xem lại + xác nhận (vẫn cho sửa nếu muốn đổi ngay tại đây, không bắt quay lại `RoomListPage`). **(b) Không có query (vào thẳng)** → form trống/default (`guests: 1`), user tự điền toàn bộ từ đầu như 1 form thường. Dù case nào, `POST /bookings` vẫn luôn phải gửi đủ `roomId/checkInDate/checkOutDate/guests` trong body — không có cách "khỏi cần form" dù đã prefill. |

## D. Profile (user)

| Page component | Route | API sử dụng | Ghi chú |
|---|---|---|---|
| `pages/profile/ProfilePage.tsx` | `/profile` | `GET /users/me`, `PATCH /users/me` | ✅ Đã dựng, có route thật (`GET`/`PATCH /users/me` cả 2 phía đã hoạt động). 🚧⚠️ **Phần avatar KHÔNG có trong trang này** — dòng cũ ghi avatar "nằm chung trang" nhưng thực tế `ProfilePage.tsx` không có khu vực avatar nào, và `POST`/`DELETE /users/me/avatar` (dù đã implement đầy đủ ở BE, Cloudinary) **chưa có cả method trong `user.api.ts`** — cần viết mới từ API layer, không chỉ thêm UI. |
| `pages/profile/ChangePasswordPage.tsx` | `/profile/change-password` | `PATCH /users/me/password` | 🚧 **CHƯA DỰNG — file/route/tab đều chưa tồn tại.** Khác `ResetPasswordPage` — form này cần nhập mật khẩu cũ. `userApi.changePassword()` đã sẵn sàng gọi thật ở `user.api.ts`, chỉ thiếu UI — hiện **không có cách nào đổi mật khẩu khi đã đăng nhập** trên FE. |

## E. Bookings (user)

| Page component | Route | API sử dụng | Ghi chú |
|---|---|---|---|
| `pages/bookings/BookingHistoryPage.tsx` | `/bookings` | `GET /bookings/me`, `PATCH /bookings/:id` (sửa, qua modal), `PATCH /bookings/:id/cancel` (huỷ, qua modal) | ✅ Đã dựng, có route thật. **Khác thiết kế gốc**: không có trang `BookingDetailPage` riêng — action Sửa/Huỷ đã gộp thẳng vào đây qua `EditBookingModal`/`CancelBookingModal` (`src/components/bookings/`), mở ngay từ card trong list. Nút "Pay" trên mỗi card (`BookingCard`, `onPay` → `handlePay`) **đã wire sẵn**, navigate tới `/bookings/:id/payment` — nhưng route đó chưa tồn tại (xem dòng `BookingPaymentPage` bên dưới) → **dead link đang bấm được thật**. Không có nút "Viết đánh giá" nào ở đây. |
| `pages/bookings/BookingDetailPage.tsx` | `/bookings/:bookingId` | `GET /bookings/:id`, `PATCH /bookings/:id` (sửa), `PATCH /bookings/:id/cancel` (huỷ, qua modal) | 🚧 **CHƯA DỰNG, và có thể sẽ KHÔNG cần dựng nữa** — thiết kế thực tế hiện tại (`BookingHistoryPage.tsx`) đã gộp toàn bộ action sửa/huỷ vào thẳng list qua modal (xem dòng trên), không drill-down vào trang chi tiết riêng. Cân nhắc xoá hẳn dòng này khỏi tài liệu nếu team chốt giữ pattern hiện tại, thay vì để treo như 1 gap cần làm. |
| `pages/bookings/BookingPaymentPage.tsx` | `/bookings/:bookingId/payment` | `POST /bookings/:id/pay` | 🚧⚠️ **Ưu tiên cao — dead link đang tồn tại thật trong code.** BE đã implement đầy đủ (mock — luôn `SUCCESS` ngay, xem `backend/docs/DANH_SACH_API.md` mục 4, kể cả case "trả bù" cho booking `ACCEPTED` chưa thanh toán). `bookingApi.pay()` đã sẵn ở `frontend/src/api/booking.api.ts`. Nhưng trang này **vẫn chưa được dựng, route chưa đăng ký** — trong khi nút "Pay" ở `BookingHistoryPage`/`BookingCard` đã navigate thẳng tới đây. Đây là gap cần ưu tiên xử lý trước các gap khác trong mục này vì đã có entry point thật cho user bấm vào. |
| `pages/bookings/BookingReviewPage.tsx` | `/bookings/:bookingId/review` | `POST /reviews` | 🚧 **CHƯA DỰNG — file/route/cả nút bấm dẫn vào đều chưa tồn tại.** Khác `BookingPaymentPage` (có nút nhưng thiếu đích), ở đây **không có nút "Viết đánh giá" nào cả** trong `BookingCard`/`BookingHistoryPage` — không có nơi nào check điều kiện "booking đã/đang ở" để hiện nút như mô tả gốc. `reviewApi.create()` đã sẵn sàng gọi thật. |
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
| `pages/admin/email-logs/AdminEmailLogListPage.tsx` | `/admin/email-logs` | `GET /admin/email-logs` | Filter theo `PENDING/SENT/FAILED/DELIVERED_UNCONFIRMED`, phân trang bằng `page`/`limit`; type có thêm `monthly-report`. |
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

> ⚠️ **Đã cập nhật sau khi đối chiếu lại với code thật** (trước đây ghi
> "không có API nào dư/không nơi dùng" — không còn đúng, xem danh sách bên
> dưới).

- `GET /rooms/:roomId/reviews` — không còn TODO nữa theo nghĩa "chưa gọi
  bao giờ": đã được `HomePage.tsx` gọi thật (carousel đánh giá phòng nổi
  bật). Vẫn TODO đúng nghĩa ở `RoomDetailPage` vì **trang đó chưa tồn tại**
  (mục C).
- `GET /payments/me` — đã implement ở BE (mục 4a), FE chưa dựng trang gọi
  tới (`PaymentHistoryPage.tsx`), **và cũng chưa có method nào trong
  `payment.api.ts`** (chỉ có `adminList()`) — TODO còn treo từ trước, để
  lại cho session sau.
- `POST`/`DELETE /users/me/avatar` — đã implement ở BE, **chưa có method
  nào trong `user.api.ts` lẫn UI trong `ProfilePage.tsx`** — API layer
  cũng phải viết mới, không chỉ thiếu UI (mục D).
- `POST /bookings/:id/pay` — đã có method thật (`bookingApi.pay()`) và đã
  có entry point thật (nút "Pay" ở `BookingHistoryPage`) nhưng **trang đích
  `BookingPaymentPage` chưa tồn tại** → dead link, ưu tiên cao (mục E).
- `POST /reviews` — có method thật (`reviewApi.create()`) nhưng **không
  màn nào gọi**, kể cả không có nút dẫn vào (mục E).
- 🆕 `GET /rooms/available` (`roomApi.listAvailable()`) và `guests` query
  trên cả `GET /rooms`/`GET /rooms/available` — đã có method + type thật
  (`ListRoomsQuery.guests`, `ListAvailableRoomsQuery`, `api/types.ts`) và
  `HomePage.tsx` đã build sẵn `?guests=` trong query string, nhưng **chưa
  màn nào tiêu thụ** vì `RoomListPage` chưa tồn tại (mục C) — sẵn sàng ở
  tầng data, chỉ chờ dựng UI.
- 🆕 `guests` trên `Booking`/`CreateBookingPayload` (`api/types.ts`) — field
  mới, `bookingApi.create()` đã nhận đúng type, nhưng **chưa màn nào gọi**
  vì `BookRoomPage` chưa tồn tại (mục C) — tương tự các field khác đã sẵn
  sàng ở tầng data, chờ dựng UI.
- `POST /mail/test`, `GET /mail/:id` (mục 12a ở doc BE) — route kiểm tra
  nội bộ đã khóa ADMIN, **không map vào màn hình FE nào cả theo thiết kế**
  (không thuộc luồng nghiệp vụ chính thức) — khác các API "thiếu UI" khác ở
  trên, đây là **cố ý không có UI**.
- `GET /admin/statistics/bookings`, `GET /admin/statistics/revenue` — mục J
  (`AdminBookingStatsPage`, `AdminRevenueStatsPage`) đã map đúng API,
  nhưng **BE chưa có module/controller nào cho 2 endpoint này** (xem
  `backend/docs/DANH_SACH_API.md` mục 11) — 2 trang FE gọi API không tồn
  tại (404 thật khi tắt mock), việc implement BE dời sang 1 PR riêng.

> ✅ Mục G/G2 (Rooms/Amenities) **đã merge xong** — không còn là thiết kế ở
> nhánh git riêng như ghi chú cũ. `AdminRoomsController` hiện có đủ cả
> `PATCH .../price`, `POST`/`DELETE .../amenities` (xem
> `backend/docs/DANH_SACH_API.md` mục 6), khớp đúng API mà `AdminRoomEditPage`
> (mục G) đang gọi.
