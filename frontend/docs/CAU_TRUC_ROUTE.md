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

## A. Route công khai (Guest + User đều vào được)

| Path | Mô tả | Ghi chú |
|---|---|---|
| `/` | Trang chủ | Nếu đã login: hiển thị thêm shortcut Profile/Lịch sử booking. Không tách route riêng cho 2 trạng thái. |
| `/login` | Đăng nhập | Hỗ trợ `?redirect=` để quay lại đúng trang sau khi login. |
| `/register` | Đăng ký | Submit xong → hiện **modal** "vui lòng kiểm tra email lấy mã OTP kích hoạt" ngay trên trang này, kèm nút chuyển sang `/activate?email=<email vừa đăng ký>` (không tự động chuyển route). |
| `/activate` | Kích hoạt tài khoản | Form nhập **email + mã OTP 6 số** (gửi qua email, user tự gõ tay). `?email=` chỉ để prefill, không bắt buộc. Kích hoạt xong → tự chuyển `/login` kèm toast thành công. |
| `/forgot-password` | Quên mật khẩu | Modal/form nhập email ngay trên trang, gửi email chứa **mã OTP** (không phải link). Sau khi gửi → hiện nút chuyển sang `/reset-password?email=<email>`. |
| `/reset-password` | Đặt lại mật khẩu | Form nhập **email + mã OTP 6 số + mật khẩu mới + xác nhận**. `?email=` chỉ để prefill. Xong → redirect `/login` kèm toast "Đổi mật khẩu thành công, vui lòng đăng nhập". |
| `/rooms` | Tìm phòng + danh sách phòng | 1 route duy nhất, filter/search qua query param. Không có danh sách mặc định và danh sách sau tìm kiếm là 2 route khác nhau. 🚧 **Route CHƯA đăng ký trong `router/index.tsx`, `pages/rooms/` không tồn tại** — `RoomListPage` chưa được dựng dù `room.api.ts` (`listPublic`/`getPublicById`) đã sẵn sàng gọi BE thật. `ROUTES.ROOMS` có khai trong `router/paths.ts` (kèm comment "chưa có trang đích") nhưng chưa nối route. **`HomePage.tsx` đã có link "View all rooms" + thanh search điều hướng tới route này** — hiện là **dead link thật khi click**, không chỉ là gap lý thuyết. 🆕 **Khi dựng trang này**: `HomePage.tsx` đã build sẵn `guests` vào query string (`/rooms?checkIn=&checkOut=&guests=`) — `RoomListPage` cần đọc lại `?guests=` (và `?checkIn=`/`?checkOut=` để quyết định gọi `roomApi.listPublic()` hay `listAvailable()`, xem `DANH_SACH_MAN_HINH.md` mục C) và truyền vào đúng field `guests` của `ListRoomsQuery`/`ListAvailableRoomsQuery` (`api/types.ts`) để lọc theo `room.capacity`. |
| `/rooms/:roomId` | Chi tiết phòng | Nút "Đặt phòng": guest bấm → redirect `/login?redirect=/rooms/:roomId`; user đã login → mở flow đặt phòng (modal hoặc route con, xem mục B). **🆕 TODO**: hiển thị thêm danh sách đánh giá của phòng, gọi `GET /rooms/:roomId/reviews` (đã implement, public — không cần login, xem `backend/docs/DANH_SACH_API.md` mục 5 và `frontend/docs/bridge.md` mục 8) — page hiện **chưa gọi** API này. 🚧 **Route + page (`RoomDetailPage`) đều CHƯA tồn tại**, chưa đăng ký trong router. Card phòng nổi bật trên `HomePage.tsx` (`onView`) đã navigate tới route này — **dead link thật**. |
| `/403` | Không có quyền truy cập | Dùng khi user thường cố vào `/admin/**`. ✅ **Đã dựng** (`pages/ForbiddenPage.tsx`), route đăng ký trong `PublicLayout`. `AdminGuard` đã sửa để redirect đúng `ROUTES.FORBIDDEN` thay vì `ROUTES.HOME` như trước. |
| `/404` | Không tìm thấy trang | Fallback route `*`. ✅ **Đã dựng** (`pages/NotFoundPage.tsx`), route fallback `path: '*'` đặt cuối cùng trong `PublicLayout` (giữ header/footer chung) — không ảnh hưởng match của `/admin/**` vì react-router chấm điểm theo độ cụ thể của path, không theo thứ tự khai báo. |

## B. Route yêu cầu đăng nhập (User)

Tất cả nằm dưới `AuthGuard`; chưa login → redirect `/login?redirect=...`.

| Path | Mô tả | Ghi chú |
|---|---|---|
| `/rooms/:roomId/book` | Đặt phòng | Gửi request tới admin (trạng thái `pending`). Cần xử lý lỗi race condition (phòng vừa bị người khác đặt) bằng thông báo rõ + gợi ý quay lại `/rooms`. 🚧 **Route + page (`BookRoomPage`) đều CHƯA tồn tại**, chưa đăng ký trong router dù `bookingApi.create()` đã sẵn sàng gọi `POST /bookings` thật. Nút "Book" trên card phòng nổi bật ở `HomePage.tsx` đã navigate tới route này — **dead link thật**. 🆕 **Khi dựng trang này**: form bắt buộc phải có input chọn số khách (`guests`, `CreateBookingPayload.guests` giờ là field bắt buộc) — validate client-side `guests <= room.capacity` (lấy từ `RoomDetailPage`) trước khi submit để UX nhanh hơn, dù BE vẫn validate lại lần cuối (400 nếu vượt). Nên hiển thị `totalPrice` ước tính = `nights × pricePerNight × guests` ngay trên form trước khi bấm đặt, khớp đúng công thức BE sẽ trả về (xem `bridge.md` mục 6) — tránh lệch số giữa giá hiển thị và giá thật. |
| `/profile` | Trang cá nhân | Xem + **chỉnh sửa thông tin** (tên, sđt, ...) + lưu. ✅ Đã dựng đủ (`ProfilePage.tsx`), có route thật trong `router/index.tsx`. |
| `/profile/change-password` | Đổi mật khẩu | Form old + new + confirm, khác với `/reset-password` (không cần old). Có thể làm tab trong `/profile` thay vì route riêng — tuỳ team quyết, nhưng nên có path riêng để deep-link được. 🚧 **Route + page (`ChangePasswordPage`) đều CHƯA tồn tại**, không có tab/route nào trong `/profile` hiện tại cho việc này — dù `userApi.changePassword()` (gọi `PATCH /users/me/password`) đã implement sẵn ở `user.api.ts`, chưa UI nào gọi tới. Hiện **không có cách nào đổi mật khẩu khi đã đăng nhập** trên FE. |
| `/profile` (khu vực avatar) | Thêm/thay/xoá avatar | Là 1 phần UI trong `/profile`, không tách route. 🚧 **Chưa implement** — `POST`/`DELETE /users/me/avatar` đã xong ở BE (Cloudinary) nhưng không có method nào trong `user.api.ts`, không có `endpoints.ts` constant, và `ProfilePage.tsx` không có khu vực avatar nào. |
| `/bookings` | Lịch sử booking | Danh sách booking của user hiện tại. ✅ Đã dựng (`BookingHistoryPage.tsx`), có route thật. **Khác thiết kế gốc của tài liệu này**: trang hiện gộp luôn action Sửa/Huỷ ngay tại đây qua modal (xem 2 dòng "Sửa booking"/"Huỷ booking" bên dưới) thay vì có trang chi tiết `/bookings/:bookingId` riêng. |
| 🚧 `/payments` | Lịch sử thanh toán | **TODO — FE chưa dựng, để session sau** (BE đã implement `GET /payments/me`, xem `backend/docs/DANH_SACH_API.md` mục 4a, sẵn sàng dùng ngay). Trang riêng cho user xem toàn bộ giao dịch thanh toán của chính mình (mọi booking gộp lại). Route nằm ngang hàng `/bookings`, page component ở `pages/payments/` (ngang hàng `pages/bookings/`), không phải route con của `/bookings/:bookingId`. Route chưa có trong `router/paths.ts` (không có `ROUTES.PAYMENTS`), và `payment.api.ts` chỉ có `adminList()` — chưa có method gọi `GET /payments/me`. |
| `/bookings/:bookingId` | Chi tiết booking | Gồm các action: | 🚧 **Route + page (drill-down riêng) CHƯA tồn tại** — thiết kế thực tế hiện tại không có trang chi tiết 1 booking cho user, mọi thứ (xem, sửa, huỷ) nằm gộp ngay trên card ở `/bookings`. Cân nhắc: bỏ hẳn route con này khỏi tài liệu nếu team chốt giữ pattern "tất cả trên list", hoặc dựng trang chi tiết thật nếu muốn tách theo đúng thiết kế gốc. |
| — Sửa booking | Form chỉnh sửa (đổi ngày...) | Modal hoặc route con `/bookings/:bookingId/edit`, tuỳ độ phức tạp form. ✅ **Đã có, dạng modal** (`EditBookingModal`, `src/components/bookings/`) mở ngay từ `/bookings`, không phải route con — khớp lựa chọn "modal" trong ô Ghi chú gốc, không dùng `/bookings/:bookingId/edit`. ⚠️ **Đã sửa cột "Mô tả" — trước đây ghi "đổi ngày, số khách...", nhưng số khách (`guests`) đã chốt là KHÔNG sửa được sau khi tạo** (xem `bridge.md` mục 6) — form sửa chỉ còn đổi `checkInDate`/`checkOutDate`/`note`, muốn đổi số khách phải huỷ và đặt lại. |
| — Huỷ booking | Popup xác nhận, có ô nhập lý do (optional) | Modal, không có route riêng. ✅ **Đã có** (`CancelBookingModal`, `src/components/bookings/`), mở từ `/bookings`. |
| — Thanh toán | **Stub** — để nút disabled hoặc trang placeholder | `/bookings/:bookingId/payment` (chưa cần làm thật). 🆕⚠️ **Đã lỗi thời — BE không còn là stub**: `POST /bookings/:id/pay` đã implement đầy đủ (mock luôn `SUCCESS`, xem `backend/docs/DANH_SACH_API.md` mục 4), `bookingApi.pay()` đã sẵn ở FE. Nhưng **route `/bookings/:bookingId/payment` vẫn CHƯA đăng ký, `BookingPaymentPage` CHƯA tồn tại** — trong khi nút "Pay" trên `BookingCard`/`BookingHistoryPage` (`handlePay`) **đã navigate thẳng tới route này** (`navigate(\`/bookings/${booking.id}/payment\`)`). Đây là **dead link đang tồn tại thật trong code hiện tại**, mức độ ưu tiên cao hơn các gap khác vì nút bấm được nhưng không tới đâu. |
| — Viết đánh giá | Chỉ hiện nếu booking đã/đang ở | Modal hoặc route con `/bookings/:bookingId/review`. 🚧 **Hoàn toàn chưa có** — không route, không page, và khác nút "Pay" (có nút nhưng thiếu đích), ở đây **không có cả nút/link nào** trong `BookingCard`/`BookingHistoryPage` trỏ tới hành động này. `POST /reviews` đã implement đủ ở cả BE lẫn FE (`reviewApi.create()`), chỉ chưa UI nào gọi. |

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
| `/admin/email-logs` | Lịch sử email | Danh sách log các email hệ thống đã gửi (đổi tài khoản, đổi trạng thái booking...), lọc theo trạng thái `PENDING/SENT/FAILED`. |
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
/rooms                     (guest/user)               🚧 route+page chưa dựng, dead link từ HomePage
/rooms/:roomId             (guest/user)               🚧 route+page chưa dựng, dead link từ HomePage
/rooms/:roomId/book        (user — auth required)     🚧 route+page chưa dựng, dead link từ HomePage
/profile                   (user)                     ✅ đã dựng
/profile/change-password   (user)                     🚧 route+page chưa dựng
/bookings                  (user)                     ✅ đã dựng (gộp cả sửa/huỷ qua modal)
/payments                  (user — TODO, chưa dựng)
/bookings/:bookingId       (user)                     🚧 không tồn tại trong thiết kế thực tế hiện tại
/bookings/:bookingId/payment  (user)                  🆕⚠️ BE hết stub rồi, FE vẫn chưa dựng — dead link thật (nút "Pay")
/bookings/:bookingId/review   (user)                  🚧 route+page+cả nút bấm đều chưa có
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
- [ ] 🆕 `/rooms/:roomId` — gọi thêm `GET /rooms/:roomId/reviews` để hiển thị
      danh sách đánh giá của phòng (đã implement ở BE, public, không cần
      login — `reviewApi.listByRoom()` đã có sẵn ở
      `frontend/src/api/review.api.ts`, chỉ chưa được dùng ở page nào). Xem
      `backend/docs/DANH_SACH_API.md` mục 5 và
      `frontend/docs/DANH_SACH_MAN_HINH.md` mục C.

### 🆕 Rà lại route thật vs `router/index.tsx` (đối chiếu code, không phải giả định)

- [ ] **Ưu tiên cao — dead link thật đang tồn tại**: `BookingHistoryPage.tsx`
      (`handlePay`) navigate tới `/bookings/:bookingId/payment` khi bấm nút
      "Pay" trên `BookingCard`, nhưng route này chưa đăng ký và
      `BookingPaymentPage` chưa tồn tại. BE đã hết stub từ lâu
      (`POST /bookings/:id/pay` implement đầy đủ) — chỉ còn thiếu đúng 1
      trang FE để nối vào nút đã có sẵn.
- [ ] **Toàn bộ nhánh `/rooms/**`** (`/rooms`, `/rooms/:roomId`,
      `/rooms/:roomId/book`) chưa có route lẫn page nào — đây là luồng
      nghiệp vụ lõi (tìm phòng → xem chi tiết → đặt phòng) của cả app, hiện
      **không có UI nào**, dù `HomePage.tsx` đã có nhiều link/nút điều
      hướng thẳng tới các route này (dead link).
- [ ] `/profile/change-password` và khu vực avatar trong `/profile` — API
      2 phía đã sẵn (`userApi.changePassword()`; riêng avatar thì **chưa cả
      API layer**, cần viết mới `POST`/`DELETE /users/me/avatar`), chỉ
      thiếu UI.
- [ ] `/bookings/:bookingId/review` — thiếu toàn bộ (route, page, cả nút
      bấm dẫn vào), dù `POST /reviews` đã sẵn sàng ở cả 2 phía.
- [x] `/403`, `/404` — đã dựng `ForbiddenPage`/`NotFoundPage`, đăng ký route
      (`ROUTES.FORBIDDEN`, fallback `path: '*'`), sửa `AdminGuard` redirect
      đúng `/403`.
- [ ] `/bookings/:bookingId` (trang chi tiết riêng) — thiết kế thực tế đã
      đổi hướng, gộp hết action vào `/bookings` qua modal
      (`EditBookingModal`, `CancelBookingModal` đã có sẵn). Cân nhắc bỏ
      route con này khỏi tài liệu thay vì để treo như 1 gap.
