# Cấu trúc Route — Frontend

> Tài liệu này chốt cấu trúc route thực tế để implement bằng `react-router-dom`,
> dựa trên cây luồng nghiệp vụ ban đầu. Xem phần "Nhận xét & thay đổi so với
> cây gốc" ở cuối file để hiểu vì sao có vài chỗ khác với bản vẽ tay.

## Quy ước chung

- Path dùng `kebab-case`, tham số động dạng `:id` (ví dụ `:roomId`, `:bookingId`).
- Query param dùng cho tìm kiếm/filter/pagination (`/rooms?location=...&checkin=...`),
  **không** tạo route riêng cho từng biến thể kết quả tìm kiếm.
- **Kích hoạt tài khoản và đặt lại mật khẩu dùng OTP nhập tay, không dùng link
  token trong email.** Email chỉ chứa **mã OTP 6 số** (không phải link kèm
  token) — user tự mở app (đã đang có sẵn tab, hoặc mở lại thủ công), vào route
  tương ứng và **gõ email + mã OTP** vào form. Do đó `/activate` và
  `/reset-password` **không nhận `?token=`**, chỉ nhận `?email=` (optional,
  chỉ để prefill sẵn ô email cho tiện, không phải cơ chế xác thực) — xác thực
  thật sự nằm ở việc user gõ đúng OTP, khớp `ActivateAccountDto`/
  `ResetPasswordDto` ở `backend/docs/DANH_SACH_API.md` /
  `frontend/docs/bridge.md`.
- 3 layout gốc, bọc bằng route cha (dùng nested route của react-router):
  - `PublicLayout` — header/footer chung, có/không có user đều thấy.
  - `AuthGuard` (bọc trong `PublicLayout`) — chặn route cần đăng nhập, chưa
    login thì redirect `/login?redirect=<path hiện tại>`.
  - `AdminLayout` + `AdminGuard` — chặn toàn bộ `/admin/**`, không phải admin
    thì redirect `/403`.
- Modal/overlay (ví dụ "chờ kích hoạt email", "popup xoá", "popup huỷ booking")
  **không** có route riêng — là UI state trong component của route cha, trừ khi
  ghi chú khác.

### ✅ Auth/role state — `AuthContext` (`src/contexts/`)

Nguồn chân lý duy nhất cho "đã đăng nhập chưa" + "role gì" trong toàn app,
thay cho việc mỗi nơi tự `getAccessToken()`/tự gọi `userApi.getProfile()`
riêng như trước:

- `contexts/AuthContext.ts` — chỉ định nghĩa `AuthContext`
  (`createContext`) + type `AuthContextValue`, không có JSX.
- `contexts/AuthProvider.tsx` — component `<AuthProvider>` bọc toàn app
  (`main.tsx`, ngoài `<RouterProvider>`). Lúc mount: nếu có access token thì
  gọi `userApi.getProfile()` 1 lần để biết `user`/`role` — API này có cặp
  real+mock như mọi API khác nên hoạt động giống nhau dù `VITE_USE_MOCK` là
  gì. Expose `{ user, isAuthenticated, isAdmin, loading, refreshUser, logout }`.
- `hooks/useAuth.ts` — hook đọc lại context (`const { isAdmin } = useAuth()`).
- 2 file tách riêng khỏi component (`AuthContext.ts`, `useAuth.ts`) vì 1 file
  vừa export component vừa export value/hook khác sẽ làm hỏng React Fast
  Refresh (`react-refresh/only-export-components`) — cùng lý do
  `statusConfigs.ts` tách khỏi `StatusBadge.tsx`.
- `LoginPage.tsx` gọi `refreshUser()` ngay sau khi `setAccessToken()` (trước
  khi `navigate()`) để `Header`/`AdminGuard` thấy đúng role mới ngay, không
  cần đợi F5. `AdminGuard.tsx` giờ chỉ đọc `useAuth()` thay vì tự fetch
  profile riêng mỗi lần vào `/admin/**` (tránh gọi API trùng lặp).
- **`Header.tsx` hiện nav/dropdown khác nhau theo role** (đọc `isAdmin` từ
  `useAuth()`, hoạt động giống nhau dù mock hay real BE):
  - **Admin đăng nhập**: thanh nav chỉ còn đúng 1 tab "Admin Console" (dẫn
    `ROUTES.ADMIN.DASHBOARD`, thay cho Home/Rooms/My Bookings/My Reviews).
    Dropdown profile chỉ còn Profile + Logout — không còn mục "Admin" (đã
    chuyển thành tab riêng, không cần lặp lại trong dropdown nữa).
  - **User thường đăng nhập**: nav giữ nguyên Home/Rooms/My Bookings/My
    Reviews. Dropdown profile có thêm "Payment History" (`/payments`) ở
    đúng vị trí mục "Admin" cũ từng nằm, cộng Profile + Logout.
  - Trước đây dropdown luôn hiện mục "Admin" bất kể role (dựa vào
    `AdminGuard` tự chặn/redirect khi bấm vào) — giờ ẩn hẳn theo role thật,
    không chỉ dựa vào guard chặn sau khi điều hướng.

## A. Route công khai (Guest + User đều vào được)

| Path | Mô tả | Ghi chú |
|---|---|---|
| `/` | Trang chủ | Nếu đã login: hiển thị thêm shortcut Profile/Lịch sử booking. Không tách route riêng cho 2 trạng thái. |
| `/login` | Đăng nhập | Hỗ trợ `?redirect=` để quay lại đúng trang sau khi login. |
| `/register` | Đăng ký | Submit xong → hiện **modal** "vui lòng kiểm tra email lấy mã OTP kích hoạt" ngay trên trang này, kèm nút chuyển sang `/activate?email=<email vừa đăng ký>` (không tự động chuyển route). |
| `/activate` | Kích hoạt tài khoản | Form nhập **email + mã OTP 6 số** (gửi qua email, user tự gõ tay). `?email=` chỉ để prefill, không bắt buộc. Kích hoạt xong → tự chuyển `/login` kèm toast thành công. |
| `/forgot-password` | Quên mật khẩu | Modal/form nhập email ngay trên trang, gửi email chứa **mã OTP** (không phải link). Sau khi gửi → hiện nút chuyển sang `/reset-password?email=<email>`. |
| `/reset-password` | Đặt lại mật khẩu | Form nhập **email + mã OTP 6 số + mật khẩu mới + xác nhận**. `?email=` chỉ để prefill. Xong → redirect `/login` kèm toast "Đổi mật khẩu thành công, vui lòng đăng nhập". |
| `/rooms` | Tìm phòng + danh sách phòng | 1 route duy nhất, filter/search qua query param. Không có danh sách mặc định và danh sách sau tìm kiếm là 2 route khác nhau. ✅ **Đã dựng** (`RoomListPage.tsx`), đăng ký trong `PublicLayout` (không cần login). Đọc `?checkIn=`/`?checkOut=`/`?guests=` để quyết định gọi `roomApi.listPublic()` hay `listAvailable()`. Có thêm filter giá/tiện nghi (chỉ gửi lên server khi ở chế độ `listAvailable`, vì `ListRoomsQuery` không nhận 2 field này) và filter `roomType`/`viewType` — 2 field này **chưa có param lọc phía server**, đang lọc client-side trên tập dữ liệu của trang hiện tại (giới hạn tạm thời, ghi rõ trong code). |
| `/rooms/:roomId` | Chi tiết phòng | Nút "Đặt phòng": guest bấm → redirect `/login?redirect=/rooms/:roomId`; user đã login → điều hướng `/rooms/:roomId/book`, giữ nguyên `checkIn/checkOut/guests` trên query nếu có. ✅ **Đã dựng** (`RoomDetailPage.tsx`), gọi `GET /rooms/:roomId/reviews` (`reviewApi.listByRoom()`) hiển thị danh sách đánh giá + điểm trung bình. |
| `/403` | Không có quyền truy cập | Dùng khi user thường cố vào `/admin/**`. ✅ **Đã dựng** (`pages/ForbiddenPage.tsx`), route đăng ký trong `PublicLayout`. `AdminGuard` đã sửa để redirect đúng `ROUTES.FORBIDDEN` thay vì `ROUTES.HOME` như trước. |
| `/404` | Không tìm thấy trang | Fallback route `*`. ✅ **Đã dựng** (`pages/NotFoundPage.tsx`), route fallback `path: '*'` đặt cuối cùng trong `PublicLayout` (giữ header/footer chung) — không ảnh hưởng match của `/admin/**` vì react-router chấm điểm theo độ cụ thể của path, không theo thứ tự khai báo. |

## B. Route yêu cầu đăng nhập (User)

Tất cả nằm dưới `AuthGuard`; chưa login → redirect `/login?redirect=...`.

| Path | Mô tả | Ghi chú |
|---|---|---|
| `/rooms/:roomId/book` | Đặt phòng | Gửi request tới admin (trạng thái `pending`). Xử lý riêng lỗi 409 Conflict (phòng vừa bị người khác đặt) bằng thông báo rõ + gợi ý quay lại `/rooms`. ✅ **Đã dựng** (`BookRoomPage.tsx`), đăng ký trong nhánh `AuthGuard`. Có input chọn số khách (`guests`, bắt buộc, validate client-side `<= room.capacity`), hiển thị `totalPrice` ước tính = `nights × pricePerNight × guests` trước khi submit. |
| `/profile` | Trang cá nhân | Xem + **chỉnh sửa thông tin** (tên, sđt, ...) + lưu. ✅ Đã dựng đủ (`ProfilePage.tsx`), có route thật trong `router/index.tsx`. |
| `/profile/change-password` | Đổi mật khẩu | ⛔ **Đã quyết định KHÔNG làm route riêng** — `ProfilePage.tsx` đã có sẵn tab "Security" chạy thật (`userApi.changePassword()`), làm thêm 1 trang riêng sẽ trùng lặp UI cho cùng 1 chức năng. Đổi mật khẩu khi đã đăng nhập dùng tab Security trong `/profile`; không nhầm với `/forgot-password` → `/reset-password` (luồng OTP dành cho lúc chưa đăng nhập, đã đầy đủ, không đụng tới). |
| `/profile` (khu vực avatar) | Thêm/thay/xoá avatar | Là 1 phần UI trong `/profile`, không tách route. ✅ **Đã dựng** — nút "Change Avatar" (mở file picker ẩn, validate type/size client-side trước khi gọi `userApi.uploadAvatar()`) + "Remove Avatar" (chỉ hiện khi đã có avatar, gọi `userApi.removeAvatar()`). Sau khi đổi/xoá đều gọi `refreshUser()` (`useAuth()`) để avatar trên `Header.tsx` cập nhật ngay, không cần F5. Giới hạn client-side (`constants/avatar.ts`: 5MB, jpg/jpeg/png/webp) PHẢI khớp `backend/src/config/avatar-upload.config.ts`. |
| `/bookings` | Lịch sử booking | Danh sách booking của user hiện tại. ✅ Đã dựng (`BookingHistoryPage.tsx`), có route thật. **Khác thiết kế gốc của tài liệu này**: trang hiện gộp luôn action Sửa/Huỷ ngay tại đây qua modal (xem 2 dòng "Sửa booking"/"Huỷ booking" bên dưới) thay vì có trang chi tiết `/bookings/:bookingId` riêng. |
| `/reviews` | Đánh giá của tôi | ✅ **Đã dựng** (`MyReviewsPage.tsx`), có tab riêng "My Reviews" trên thanh nav ngang hàng "My Bookings" (`Header.tsx`, chỉ hiện với user thường). Liệt kê toàn bộ đánh giá user hiện tại đã viết, gộp từ mọi phòng, qua `reviewApi.listMine()` (`GET /reviews/me`). |
| `/payments` | Lịch sử thanh toán | ✅ **Đã dựng** (`PaymentHistoryPage.tsx`), đăng ký trong nhánh `AuthGuard`, `ROUTES.PAYMENTS` trong `router/paths.ts`. Trang cho user xem toàn bộ giao dịch thanh toán của chính mình (mọi booking gộp lại) qua `paymentApi.listMine()` (`GET /payments/me`) — filter theo `status`/`method` (2 `Dropdown`), phân trang. Không có link riêng trên thanh nav — truy cập qua mục "Payment History" trong dropdown profile (`Header.tsx`, chỉ hiện với user thường, xem mục "Auth/role state" ở trên). |
| `/bookings/:bookingId` | Chi tiết booking | Gồm các action: | 🚧 **Route + page (drill-down riêng) CHƯA tồn tại** — thiết kế thực tế hiện tại không có trang chi tiết 1 booking cho user, mọi thứ (xem, sửa, huỷ) nằm gộp ngay trên card ở `/bookings`. Cân nhắc: bỏ hẳn route con này khỏi tài liệu nếu team chốt giữ pattern "tất cả trên list", hoặc dựng trang chi tiết thật nếu muốn tách theo đúng thiết kế gốc. |
| — Sửa booking | Form chỉnh sửa (đổi ngày...) | Modal hoặc route con `/bookings/:bookingId/edit`, tuỳ độ phức tạp form. ✅ **Đã có, dạng modal** (`EditBookingModal`, `src/components/bookings/`) mở ngay từ `/bookings`, không phải route con — khớp lựa chọn "modal" trong ô Ghi chú gốc, không dùng `/bookings/:bookingId/edit`. ⚠️ **Đã sửa cột "Mô tả" — trước đây ghi "đổi ngày, số khách...", nhưng số khách (`guests`) đã chốt là KHÔNG sửa được sau khi tạo** (xem `bridge.md` mục 6) — form sửa chỉ còn đổi `checkInDate`/`checkOutDate`/`note`, muốn đổi số khách phải huỷ và đặt lại. |
| — Huỷ booking | Popup xác nhận, có ô nhập lý do (optional) | Modal, không có route riêng. ✅ **Đã có** (`CancelBookingModal`, `src/components/bookings/`), mở từ `/bookings`. |
| — Thanh toán | `/bookings/:bookingId/payment` | ✅ **Đã dựng** (`BookingPaymentPage.tsx`), đăng ký trong nhánh `AuthGuard`. Chọn method (`CASH`/`BANK_TRANSFER`/`CREDIT_CARD`/`VNPAY`) → `bookingApi.pay()`, bắt riêng lỗi 409 Conflict. Nút "Pay" trên `BookingCard`/`BookingHistoryPage` không còn là dead link. |
| — Viết đánh giá | Chỉ hiện nếu booking đã/đang ở | Route con `/bookings/:bookingId/review`. ✅ **Đã dựng** — nút "Viết đánh giá" trên `BookingCard` chỉ hiện khi ACCEPTED + đã thanh toán + qua `checkOutDate`, dẫn tới `BookingReviewPage` (`POST /reviews`). |

> Mọi thay đổi trạng thái tài khoản/booking đều trigger gửi email — không ảnh
> hưởng routing, chỉ cần đảm bảo FE hiển thị đúng toast/thông báo tương ứng.

## C. Khu vực Admin (`/admin/**`)

Tất cả nằm dưới `AdminLayout` + `AdminGuard` (role !== admin → `/403`).

| Path | Mô tả | Ghi chú |
|---|---|---|
| `/admin` | Admin Dashboard | Trang tổng quan sau khi admin login. |
| `/admin/users` | Quản lý người dùng | Danh sách. |
| `/admin/users/:userId` | Chi tiết user | Nút active/inactive gọi `PATCH /admin/users/:id`. |

> 🆕 BE đã có sẵn `POST /admin/users` (tạo user) và `DELETE /admin/users/:id`
> (xoá mềm) nhưng **chưa chốt route/UI FE** cho 2 hành động này — tương tự
> pattern phòng (`/admin/rooms/new` cho tạo, popup xác nhận cho xoá) nếu cần
> làm, xem `frontend/docs/DANH_SACH_MAN_HINH.md` mục F và
> `backend/docs/DANH_SACH_API.md` mục 8.
| `/admin/rooms` | Quản lý phòng | Search, filter, danh sách + nút Export Excel. |
| `/admin/rooms/:roomId` | Xem chi tiết 1 phòng | |
| `/admin/rooms/new` | Thêm phòng | Route riêng (form nhiều field), không dùng modal. |
| `/admin/rooms/:roomId/edit` | Sửa phòng | Gồm cả gán/gỡ tiện nghi và đổi ảnh đại diện (1 ảnh/phòng, xem `frontend/docs/bridge.md` mục 4) — không tách route con. |
| — Xoá phòng | Popup xác nhận | Modal, kiểm tra và báo lỗi nếu đang có người đặt/ở tại thời điểm xoá — BE trả lỗi, FE hiện toast/modal lỗi. |
| `/admin/amenities` | Quản lý tiện nghi | 🆕 Danh sách + tạo/sửa qua modal + xoá qua popup xác nhận, không có route con — cùng pattern với `/admin/reviews`. |
| `/admin/bookings` | Quản lý booking | Danh sách. |
| `/admin/bookings/:bookingId` | Chi tiết booking | Action Từ chối (popup, có lý do) / Chấp nhận — không cần route riêng. |
| `/admin/reviews` | Quản lý đánh giá | Danh sách có sort. |
| — Xoá đánh giá | Popup xác nhận | Modal. |
| `/admin/statistics/bookings` | Thống kê Booking | Route con của `/admin/statistics`, dùng tab UI để share URL theo từng tab. |
| `/admin/statistics/revenue` | Thống kê Doanh thu | |
| `/admin/email-logs` | Lịch sử email | Danh sách log email hệ thống và báo cáo tháng, lọc theo `PENDING/SENT/FAILED/DELIVERED_UNCONFIRMED`, phân trang bằng `page`/`limit`. |
| `/admin/email-logs/:logId` | Chi tiết log email | Nếu trạng thái `FAILED`: hiện nút **"Gửi lại"** → gọi `POST /admin/email-logs/:id/retry`. Không cần route riêng. |

## Sơ đồ rút gọn

```
/                          (guest/user)
/login                     (guest)
  ?redirect=<path>
/register                  (guest)
/activate?email=           (guest, nhập OTP tay từ email)
/forgot-password           (guest)
/reset-password?email=     (guest, nhập OTP tay từ email)
/rooms                     (guest/user)               ✅ đã dựng
/rooms/:roomId             (guest/user)               ✅ đã dựng
/rooms/:roomId/book        (user — auth required)     ✅ đã dựng
/profile                   (user)                     ✅ đã dựng
/profile/change-password   (user)                     ⛔ đã quyết định KHÔNG làm — dùng tab Security trong /profile
/bookings                  (user)                     ✅ đã dựng (gộp cả sửa/huỷ qua modal)
/reviews                   (user)                     ✅ đã dựng
/payments                  (user)                     ✅ đã dựng
/bookings/:bookingId       (user)                     🚧 không tồn tại trong thiết kế thực tế hiện tại
/bookings/:bookingId/payment  (user)                  ✅ đã dựng
/bookings/:bookingId/review   (user)                  ✅ đã dựng
/403                       (system)                   ✅ đã dựng
/404                       (system)                   ✅ đã dựng

/admin                          (admin)
/admin/users                    (admin)
/admin/users/:userId            (admin)
/admin/rooms                    (admin)
/admin/rooms/:roomId            (admin)
/admin/rooms/new                (admin)
/admin/rooms/:roomId/edit       (admin)
/admin/amenities                (admin)
/admin/bookings                 (admin)
/admin/bookings/:bookingId      (admin)
/admin/reviews                  (admin)
/admin/statistics/bookings      (admin)
/admin/statistics/revenue       (admin)
/admin/email-logs               (admin)
/admin/email-logs/:logId        (admin)
```

## Nhận xét & thay đổi so với cây gốc

- **Gộp 2 "Trang chủ" thành 1 route `/`**: cây gốc để "Trang chủ (sau khi đăng
  nhập)" lồng dưới "Đăng nhập" — nhưng đây chỉ là cùng 1 trang render khác nhau
  theo auth state, không phải 2 route.
- **`/rooms` đưa ra khỏi nhánh "sau khi đăng nhập"**: cây gốc lồng "Tìm phòng"
  dưới trang chủ sau login dù có đánh dấu guest truy cập được (`*`) — gây mâu
  thuẫn. Đưa thành route ngang hàng, độc lập với auth.
- **Bỏ route riêng cho "danh sách phòng sau khi tìm kiếm"**: gộp vào `/rooms`
  bằng query param, tránh nhân đôi trang không cần thiết.
- **Modal "chờ kích hoạt email" không có route riêng**, nhưng **"kích hoạt" và
  "đặt lại mật khẩu" bắt buộc phải có route thật** — dù không còn mở từ link
  trong email (đã đổi sang **nhập OTP tay**, xem "Quy ước chung"), user vẫn
  cần 1 route độc lập, gõ được thẳng URL hoặc bookmark, để nhập email + mã OTP
  bất cứ lúc nào sau khi nhận được mail, không phụ thuộc còn ở đúng tab lúc
  bấm submit hay không.
- **Thêm `/403` và `/404`** — cây gốc không đề cập nhưng bắt buộc phải có khi
  build thật, đặc biệt để chặn user thường vào khu vực admin.
- **Tách namespace `/admin/**` rõ ràng**, có guard riêng theo role, thay vì để
  ngang hàng mơ hồ với cây user.
- **Thêm luồng `redirect` khi guest bấm "Đặt phòng"**: `/login?redirect=/rooms/:id`
  để sau khi login quay lại đúng chỗ đang thao tác dở.
- **Thêm route stub `/bookings/:bookingId/payment`**: giữ chỗ theo đúng yêu cầu
  "chưa cần làm, để stub sau".

## Việc cần làm khi implement

- [ ] Cài đặt `react-router-dom` router (đã có sẵn trong `package.json`), dùng
      `createBrowserRouter` với nested routes theo 3 layout ở trên.
- [ ] Viết `AuthGuard`, `AdminGuard` (kiểm tra token/role từ state auth — xem
      `src/api/axiosClient.ts` cho phần lấy/xoá token).
- [ ] Style guide UI (áp dụng Tailwind + theme Ant Design) — làm sau, không
      block việc dựng khung route.
- [ ] Xử lý riêng lỗi `409 Conflict` khi gọi `POST /rooms/:roomId/book` (race
      condition — phòng vừa bị người khác đặt): hiện thông báo "chọn phòng
      khác" thay vì toast lỗi chung. Format response/error đã chốt tại
      `backend/docs/DANH_SACH_API.md` (mục "Response envelope").
- [x] `/rooms/:roomId` — gọi thêm `GET /rooms/:roomId/reviews` để hiển thị
      danh sách đánh giá của phòng, đã nối trong `RoomDetailPage.tsx`.

### Rà lại route thật vs `router/index.tsx` (đối chiếu code, không phải giả định)

- [x] `BookingPaymentPage.tsx` đã dựng, route `/bookings/:bookingId/payment`
      đã đăng ký — nút "Pay" trên `BookingCard`/`BookingHistoryPage` không
      còn là dead link.
- [x] Toàn bộ nhánh `/rooms/**` (`/rooms`, `/rooms/:roomId`,
      `/rooms/:roomId/book`) đã có route + page, nối `HomePage.tsx`.
- [x] `/profile/change-password` — đã quyết định **không làm route riêng**,
      dùng tab Security có sẵn trong `ProfilePage.tsx`.
- [x] Khu vực avatar trong `/profile` — đã dựng (`userApi.uploadAvatar()`/
      `removeAvatar()` + UI), xem dòng `/profile` (khu vực avatar) ở mục B.
- [x] **Bug đăng xuất đã sửa** — `Header.tsx`/`AdminLayout.tsx` giờ gọi
      `authApi.logout()` (`POST /auth/logout`, thu hồi token qua Redis
      blacklist) TRƯỚC khi xoá token cục bộ, best-effort (không chặn đăng
      xuất nếu request lỗi/mạng down). Trước đây chỉ `clearAccessToken()`
      phía client, blacklist không bao giờ được kích hoạt.
- [x] `/bookings/:bookingId/review` — đã dựng, nút "Viết đánh giá" trên
      `BookingCard` gate đúng điều kiện BE (`ReviewsService.create()`).
- [x] `/reviews` (`MyReviewsPage.tsx`) và `/payments` (`PaymentHistoryPage.tsx`)
      — cả 2 đã dựng, truy cập qua `Header.tsx` (tab nav + dropdown profile,
      xem mục "Auth/role state" ở đầu file).
- [x] `/403`, `/404` — đã dựng `ForbiddenPage`/`NotFoundPage`, đăng ký route
      (`ROUTES.FORBIDDEN`, fallback `path: '*'`), sửa `AdminGuard` redirect
      đúng `/403`.
- [ ] `/bookings/:bookingId` (trang chi tiết riêng) — thiết kế thực tế đã
      đổi hướng, gộp hết action vào `/bookings` qua modal
      (`EditBookingModal`, `CancelBookingModal` đã có sẵn). Cân nhắc bỏ
      route con này khỏi tài liệu thay vì để treo như 1 gap.
