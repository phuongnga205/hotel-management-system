# Cấu trúc Route — Frontend

> Tài liệu này chốt cấu trúc route thực tế để implement bằng `react-router-dom`,
> dựa trên cây luồng nghiệp vụ ban đầu. Xem phần "Nhận xét & thay đổi so với
> cây gốc" ở cuối file để hiểu vì sao có vài chỗ khác với bản vẽ tay.

## Quy ước chung

- Path dùng `kebab-case`, tham số động dạng `:id` (ví dụ `:roomId`, `:bookingId`).
- Query param dùng cho tìm kiếm/filter/pagination (`/rooms?location=...&checkin=...`),
  **không** tạo route riêng cho từng biến thể kết quả tìm kiếm.
- Token nhận qua email (kích hoạt tài khoản, reset mật khẩu) luôn đi qua **query
  param** trên 1 route thật (`?token=...`), vì user bấm từ ngoài app.
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
| `/register` | Đăng ký | Submit xong → hiện **modal** "vui lòng kiểm tra email kích hoạt" ngay trên trang này, không đổi route. |
| `/activate` | Kích hoạt tài khoản | Mở từ link trong email, `?token=...`. Kích hoạt xong → tự chuyển `/login` kèm toast thành công. |
| `/forgot-password` | Quên mật khẩu | Modal/form nhập email ngay trên trang (hoặc mở từ `/login`), gửi email chứa link reset. |
| `/reset-password` | Đặt lại mật khẩu | Mở từ link email, `?token=...`. Form nhập new + confirm password. Xong → redirect `/login` kèm toast "Đổi mật khẩu thành công, vui lòng đăng nhập". |
| `/rooms` | Tìm phòng + danh sách phòng | 1 route duy nhất, filter/search qua query param. Không có danh sách mặc định và danh sách sau tìm kiếm là 2 route khác nhau. |
| `/rooms/:roomId` | Chi tiết phòng | Nút "Đặt phòng": guest bấm → redirect `/login?redirect=/rooms/:roomId`; user đã login → mở flow đặt phòng (modal hoặc route con, xem mục B). |
| `/403` | Không có quyền truy cập | Dùng khi user thường cố vào `/admin/**`. |
| `/404` | Không tìm thấy trang | Fallback route `*`. |

## B. Route yêu cầu đăng nhập (User)

Tất cả nằm dưới `AuthGuard`; chưa login → redirect `/login?redirect=...`.

| Path | Mô tả | Ghi chú |
|---|---|---|
| `/rooms/:roomId/book` | Đặt phòng | Gửi request tới admin (trạng thái `pending`). Cần xử lý lỗi race condition (phòng vừa bị người khác đặt) bằng thông báo rõ + gợi ý quay lại `/rooms`. |
| `/profile` | Trang cá nhân | Xem + **chỉnh sửa thông tin** (tên, sđt, ...) + lưu. |
| `/profile/change-password` | Đổi mật khẩu | Form old + new + confirm, khác với `/reset-password` (không cần old). Có thể làm tab trong `/profile` thay vì route riêng — tuỳ team quyết, nhưng nên có path riêng để deep-link được. |
| `/profile` (khu vực avatar) | Thêm/thay/xoá avatar | Là 1 phần UI trong `/profile`, không tách route. |
| `/bookings` | Lịch sử booking | Danh sách booking của user hiện tại. |
| `/bookings/:bookingId` | Chi tiết booking | Gồm các action: |
| — Sửa booking | Form chỉnh sửa (đổi ngày, số khách...) | Modal hoặc route con `/bookings/:bookingId/edit`, tuỳ độ phức tạp form. |
| — Huỷ booking | Popup xác nhận, có ô nhập lý do (optional) | Modal, không có route riêng. |
| — Thanh toán | **Stub** — để nút disabled hoặc trang placeholder | `/bookings/:bookingId/payment` (chưa cần làm thật). |
| — Viết đánh giá | Chỉ hiện nếu booking đã/đang ở | Modal hoặc route con `/bookings/:bookingId/review`. |

> Mọi thay đổi trạng thái tài khoản/booking đều trigger gửi email — không ảnh
> hưởng routing, chỉ cần đảm bảo FE hiển thị đúng toast/thông báo tương ứng.

## C. Khu vực Admin (`/admin/**`)

Tất cả nằm dưới `AdminLayout` + `AdminGuard` (role !== admin → `/403`).

| Path | Mô tả | Ghi chú |
|---|---|---|
| `/admin` | Admin Dashboard | Trang tổng quan sau khi admin login. |
| `/admin/users` | Quản lý người dùng | Danh sách. |
| `/admin/users/:userId` | Chi tiết user | |
| `/admin/rooms` | Quản lý phòng | Search, filter, danh sách + nút Export Excel. |
| `/admin/rooms/:roomId` | Xem chi tiết 1 phòng | |
| `/admin/rooms/new` | Thêm phòng | Route riêng (form nhiều field), không dùng modal. |
| `/admin/rooms/:roomId/edit` | Sửa phòng | |
| — Xoá phòng | Popup xác nhận | Modal, kiểm tra và báo lỗi nếu đang có người đặt/ở tại thời điểm xoá — BE trả lỗi, FE hiện toast/modal lỗi. |
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
/activate?token=           (guest, từ email)
/forgot-password           (guest)
/reset-password?token=     (guest, từ email)
/rooms                     (guest/user)
/rooms/:roomId             (guest/user)
/rooms/:roomId/book        (user — auth required)
/profile                   (user)
/profile/change-password   (user)
/bookings                  (user)
/bookings/:bookingId       (user)
/bookings/:bookingId/payment  (user — stub)
/bookings/:bookingId/review   (user)
/403                       (system)
/404                       (system)

/admin                          (admin)
/admin/users                    (admin)
/admin/users/:userId            (admin)
/admin/rooms                    (admin)
/admin/rooms/:roomId            (admin)
/admin/rooms/new                (admin)
/admin/rooms/:roomId/edit       (admin)
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
  "đặt lại mật khẩu" bắt buộc phải có route thật** vì được mở từ link email
  (ngoài phiên làm việc hiện tại của app).
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
