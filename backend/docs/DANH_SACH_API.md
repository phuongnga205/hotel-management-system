# Danh sách API (dự kiến) — Hotel Management System

> ⚠️ Chưa chốt. Đây là bản chuẩn hoá lại danh sách API do team đề xuất, đã sửa
> các lỗi convention và đánh dấu `🚧 TODO` cho phần còn thiếu/xung đột cần
> quyết định trước khi implement. Base URL: `http://localhost:3000` (xem
> `main.ts`), global prefix: **`/api/v1`**.

## Quy ước chung

- **Versioning**: mọi route đều có prefix `/api/v1` (đã cấu hình ở `setGlobalPrefix` trong `main.ts`).
- **Không dùng trailing slash**: `/api/v1/rooms`, không phải `/api/v1/rooms/`.
- **Method theo đúng ngữ nghĩa REST**:
  - `POST` — tạo mới.
  - `GET` — đọc, không có side-effect.
  - `PATCH` — cập nhật **một phần** resource (dùng cho hầu hết trường hợp "chỉnh sửa" trong hệ thống này).
  - `PUT` — chỉ dùng khi thay thế **toàn bộ** resource (hệ thống hiện chưa có case nào cần, nên **không dùng `PUT`**).
  - `DELETE` — xoá.
- **Action đổi trạng thái** (không phải CRUD thuần) dùng dạng
  `PATCH /resource/:id/<action>`, ví dụ `/bookings/:id/cancel`,
  `/admin/bookings/:id/accept`. Riêng "gửi lại email" (`retry`) dùng `POST`
  vì đây là tạo ra 1 lần gửi mới (side-effect tạo mới), không phải đổi state
  của chính resource `email-log` đó theo nghĩa thông thường.
- **Namespace `/admin/**`**: mọi endpoint mà **màn hình hiển thị/dữ liệu khác
  hẳn với phía User** (không chỉ khác quyền, mà khác cả field trả về, filter,
  hoặc thấy được cả dữ liệu User không thấy — vd phòng inactive, mọi booking
  của mọi người) đều đặt dưới `/api/v1/admin/**`, tách biệt hoàn toàn khỏi
  endpoint public/self-service. Bảng `@Controller('admin/rooms')`,
  `@Controller('admin/bookings')`... riêng, không dùng chung controller với
  bản public. Namespace này khớp 1:1 với route FE `/admin/**` đã chốt ở
  `frontend/docs/CAU_TRUC_ROUTE.md`.
  - Những action Admin làm nhưng **dữ liệu/hình dạng response giống hệt**
    phía User (chỉ khác quyền) — ví dụ tạo/sửa/xoá phòng — vẫn có thể gộp
    logic xử lý, nhưng route vẫn nên nằm dưới `/admin/rooms` để rõ ràng khi
    đọc log, viết Swagger, và áp `RolesGuard(ADMIN)` ở cấp controller thay vì
    từng method riêng lẻ.
- **Auth**: ghi rõ theo 1 trong 3 dạng:
  - `Không cần` — public, ai cũng gọi được.
  - `JWT` — cần Bearer token hợp lệ, không phân biệt role.
  - `JWT + RolesGuard(ADMIN)` — cần Bearer token **và** role admin (áp ở cấp
    `@Controller('admin/...')` bằng `@UseGuards(JwtAuthGuard, RolesGuard)` +
    `@Roles('admin')` chung cho cả controller).
- **Query param filter/pagination** dùng chung tên cho mọi list endpoint:
  `page`, `limit`, `sort` (vd `sort=-createdAt`), tên field filter camelCase
  (`checkIn`, `checkOut`, `roomType`, `amenities`, `view`, `status`...).

### i18n cho `message`

Toàn bộ `message` trong response (thành công lẫn lỗi) đều lấy qua
**`nestjs-i18n`** (đã cấu hình sẵn ở `AppModule`, xem
`src/i18n/{vi,en}/messages.json`), **không hardcode chuỗi tiếng Việt/Anh
trong code**.

- Key đặt `UPPER_SNAKE_CASE`, đúng theo file mẫu hiện có
  (`USER_NOT_FOUND`, ...) — thêm key mới thì phải có ở **cả** `vi/messages.json`
  và `en/messages.json`.
- Ngôn ngữ được resolve theo thứ tự: query `?lang=` → header
  `Accept-Language` → custom header `x-lang` → fallback `vi`.
- FE nên gửi kèm header `x-lang` (lấy từ `i18n.language` hiện tại của
  `react-i18next`, xem `frontend/docs/HUONG_DAN_I18N.md`) trên mọi request
  qua `axiosClient`, để message trả về đúng ngôn ngữ user đang chọn — thêm
  vào request interceptor cùng chỗ gắn JWT token
  (`frontend/src/api/axiosClient.ts`).
- Do message đổi theo ngôn ngữ, khẳng định lại quy tắc ở trên: **FE tuyệt
  đối không so khớp chuỗi `message` để phân biệt loại lỗi**, chỉ dùng
  `statusCode` (và các case đặc biệt như 409 ở mục race condition).

### Response envelope (đã chốt)

**Thành công** — luôn có `statusCode`, `message` (dịch theo `nestjs-i18n`,
hiển thị được thẳng ra UI), `data`:

```jsonc
// Không phải list
{
  "statusCode": 200,
  "message": "Lấy thông tin phòng thành công.",
  "data": { "id": 12, "roomNumber": "101", /* ... */ }
}

// List — luôn theo đúng format phân trang này
{
  "statusCode": 200,
  "message": "Lấy danh sách phòng thành công.",
  "data": {
    "items": [ /* ... */ ],
    "total": 34,
    "page": 1,
    "limit": 10,
    "totalPages": 4
  }
}
```

**Lỗi** — dùng nguyên format mặc định của NestJS (`HttpExceptionFilter`
chung toàn app), không thêm field tuỳ biến:

```jsonc
{
  "statusCode": 400,
  "message": "Tham số truy vấn không hợp lệ (minPrice phải nhỏ hơn hoặc bằng maxPrice)",
  "error": "Bad Request"
}
```

- FE phân biệt loại lỗi bằng **`statusCode`** (400/401/403/404/409/500...),
  **không** so khớp chuỗi `message` (message là tiếng Việt, hiển thị trực
  tiếp ra toast/form, có thể đổi câu chữ bất cứ lúc nào mà không báo trước).
- **Race condition khi đặt phòng** (`POST /bookings`, `PATCH /bookings/:id`):
  trả **`409 Conflict`** (`error: "Conflict"`), message dạng "Phòng đã được
  đặt trong khoảng thời gian này, vui lòng chọn phòng khác." — FE bắt riêng
  `statusCode === 409` ở 2 endpoint này để hiện UI "chọn phòng khác" thay vì
  toast lỗi chung chung.
- Lỗi validate input (thiếu field, sai kiểu dữ liệu...) dùng `400 Bad
  Request` với `message` là mảng string nếu có nhiều lỗi cùng lúc (theo
  `ValidationPipe` mặc định của NestJS), FE hiển thị lỗi đầu tiên hoặc lặp
  qua từng field nếu form hỗ trợ.

---

## 1. Auth

| Chức năng | Method | URL | Quyền | Auth |
|---|---|---|---|---|
| Đăng ký | POST | `/api/v1/auth/register` | Guest | Không cần |
| Kích hoạt tài khoản (từ link email) | GET | `/api/v1/auth/activate?token={token}` | Guest | Không cần (token 1 lần dùng, truyền qua query) |
| Đăng nhập | POST | `/api/v1/auth/login` | Guest | Không cần |
| Đăng xuất | POST | `/api/v1/auth/logout` | User | JWT |
| Quên mật khẩu | POST | `/api/v1/auth/forgot-password` | Guest | Không cần |
| Đặt lại mật khẩu | POST | `/api/v1/auth/reset-password` | Guest (xác thực bằng reset token trong body) | Không cần |

## 2. Users (self-service)

| Chức năng | Method | URL | Quyền | Auth |
|---|---|---|---|---|
| Xem thông tin cá nhân | GET | `/api/v1/users/me` | User | JWT |
| Chỉnh sửa thông tin cá nhân | PATCH | `/api/v1/users/me` | User | JWT |
| Đổi mật khẩu (đã đăng nhập) | PATCH | `/api/v1/users/me/password` | User | JWT |
| Thêm/thay ảnh đại diện | POST | `/api/v1/users/me/avatar` | User | JWT |
| 🚧 Xoá ảnh đại diện | DELETE | `/api/v1/users/me/avatar` | User | JWT |

## 3. Rooms (public / user)

| Chức năng | Method | URL | Quyền | Auth |
|---|---|---|---|---|
| Xem danh sách phòng (hỗ trợ filter) | GET | `/api/v1/rooms` | Guest / User | Không cần |
| Tìm phòng còn trống theo thời gian + tiện nghi | GET | `/api/v1/rooms/available` | Guest / User | Không cần |
| Xem chi tiết phòng | GET | `/api/v1/rooms/:id` | Guest / User | Không cần |

> **Giữ `/rooms/available`, không gộp vào cột `status`**: cột `rooms.status`
> (varchar/enum: `ACTIVE` / `INACTIVE` / `MAINTENANCE`) chỉ phản ánh **trạng
> thái tĩnh** của phòng (phòng có đang được vận hành hay không), không biết
> gì về **khoảng ngày cụ thể** người dùng đang tìm. Một phòng `status =
> ACTIVE` vẫn có thể đã kín lịch cho tuần sau vì đã có booking `ACCEPTED`
> trùng ngày — điều này chỉ xác định được bằng cách join/kiểm tra bảng
> `bookings` (không có overlap ngày `checkIn`–`checkOut` với booking đã
> accepted), chứ không đọc được từ 1 cột status trên bảng `rooms`.
> Vậy `GET /rooms/available?checkIn=&checkOut=&amenities=...` nên implement
> = lọc `rooms.status = ACTIVE` **kết hợp** không tồn tại booking `ACCEPTED`
> chồng ngày trong khoảng yêu cầu — 2 điều kiện độc lập, không thể thay thế
> nhau, nên endpoint riêng vẫn cần giữ.

## 4. Bookings (user)

| Chức năng | Method | URL | Quyền | Auth |
|---|---|---|---|---|
| Tạo request đặt phòng | POST | `/api/v1/bookings` | User | JWT |
| Xem chi tiết request đặt phòng của chính mình | GET | `/api/v1/bookings/:id` | User (chỉ chủ booking — service tự check `booking.userId === req.user.id`, không phải của mình → 403) | JWT |
| Xem lịch sử các request của tôi | GET | `/api/v1/bookings/me` | User | JWT |
| Chỉnh sửa request đặt phòng | PATCH | `/api/v1/bookings/:id` | User (chủ booking) | JWT |
| Huỷ request đặt phòng (kèm lý do) | PATCH | `/api/v1/bookings/:id/cancel` | User (chủ booking) | JWT |
| Thanh toán request đặt phòng | POST | `/api/v1/bookings/:id/pay` | User (chủ booking) | JWT — *stub, làm sau* |

## 5. Reviews (user)

| Chức năng | Method | URL | Quyền | Auth |
|---|---|---|---|---|
| Tạo đánh giá cho phòng đã đặt | POST | `/api/v1/reviews` | User | JWT |
| 🚧 (Tuỳ chọn) Xem đánh giá công khai theo phòng | GET | `/api/v1/rooms/:id/reviews` | Guest / User | Không cần — *chưa có trong yêu cầu ban đầu, đề xuất thêm vì trang chi tiết phòng thường cần hiển thị review* |

---

## 6. Admin — Rooms

| Chức năng | Method | URL | Quyền | Auth |
|---|---|---|---|---|
| Xem danh sách phòng (đầy đủ, gồm cả inactive/maintenance) | GET | `/api/v1/admin/rooms` | Admin | JWT + RolesGuard(ADMIN) |
| Xem chi tiết 1 phòng (view quản trị) | GET | `/api/v1/admin/rooms/:id` | Admin | JWT + RolesGuard(ADMIN) |
| Tạo phòng | POST | `/api/v1/admin/rooms` | Admin | JWT + RolesGuard(ADMIN) |
| Chỉnh sửa thông tin phòng | PATCH | `/api/v1/admin/rooms/:id` | Admin | JWT + RolesGuard(ADMIN) |
| Xoá phòng | DELETE | `/api/v1/admin/rooms/:id` | Admin | JWT + RolesGuard(ADMIN) |
| 🚧 Export danh sách phòng ra Excel | GET | `/api/v1/admin/rooms/export` | Admin | JWT + RolesGuard(ADMIN) |

## 7. Admin — Bookings

| Chức năng | Method | URL | Quyền | Auth |
|---|---|---|---|---|
| 🚧 Xem danh sách toàn bộ booking (mọi user, đủ filter/sort) | GET | `/api/v1/admin/bookings` | Admin | JWT + RolesGuard(ADMIN) |
| 🚧 Xem chi tiết booking (view quản trị, gồm thông tin user đặt) | GET | `/api/v1/admin/bookings/:id` | Admin | JWT + RolesGuard(ADMIN) |
| 🚧 Chấp nhận request đặt phòng | PATCH | `/api/v1/admin/bookings/:id/accept` | Admin | JWT + RolesGuard(ADMIN) |
| 🚧 Từ chối request đặt phòng (kèm lý do) | PATCH | `/api/v1/admin/bookings/:id/reject` | Admin | JWT + RolesGuard(ADMIN) |

## 8. Admin — Users

| Chức năng | Method | URL | Quyền | Auth |
|---|---|---|---|---|
| Xem danh sách người dùng | GET | `/api/v1/admin/users` | Admin | JWT + RolesGuard(ADMIN) |
| Xem chi tiết người dùng | GET | `/api/v1/admin/users/:id` | Admin | JWT + RolesGuard(ADMIN) |
| Thay đổi trạng thái người dùng (active/inactive) | PATCH | `/api/v1/admin/users/:id/status` | Admin | JWT + RolesGuard(ADMIN) |

## 9. Admin — Reviews

| Chức năng | Method | URL | Quyền | Auth |
|---|---|---|---|---|
| 🚧 Xem danh sách đánh giá (toàn hệ thống, hỗ trợ sort) | GET | `/api/v1/admin/reviews` | Admin | JWT + RolesGuard(ADMIN) |
| Xoá đánh giá | DELETE | `/api/v1/admin/reviews/:id` | Admin | JWT + RolesGuard(ADMIN) |

> **Chốt**: `DELETE /admin/reviews/:id` không nhận body, chỉ cần `id` trên
> path. Email thông báo cho User (event `ReviewDeleted`, xem mục 12) dùng
> **1 mẫu (template) cố định**, không có phần lý do tuỳ chỉnh từ Admin.

## 10. Admin — Statistics

| Chức năng | Method | URL | Quyền | Auth |
|---|---|---|---|---|
| Thống kê booking (theo tháng/quý/loại phòng/trạng thái) | GET | `/api/v1/admin/statistics/bookings` | Admin | JWT + RolesGuard(ADMIN) |
| Thống kê doanh thu (theo thời gian/loại phòng) | GET | `/api/v1/admin/statistics/revenue` | Admin | JWT + RolesGuard(ADMIN) |

## 11. Admin — Email Log

| Chức năng | Method | URL | Quyền | Auth |
|---|---|---|---|---|
| Xem lịch sử gửi email (lọc theo PENDING/SENT/FAILED) | GET | `/api/v1/admin/email-logs` | Admin | JWT + RolesGuard(ADMIN) |
| Xem chi tiết 1 email log | GET | `/api/v1/admin/email-logs/:id` | Admin | JWT + RolesGuard(ADMIN) |
| Gửi lại email thất bại | POST | `/api/v1/admin/email-logs/:id/retry` | Admin | JWT + RolesGuard(ADMIN) |

---

## 12. Sự kiện & Job nội bộ (KHÔNG phải REST API)

> Các mục này **không có URL/method HTTP**, FE **không** gọi trực tiếp. Ghi
> lại ở đây để team biết luồng gửi email tự động vận hành thế nào, tránh
> nhầm là API còn thiếu.

| Chức năng | Cơ chế | Trigger | Ghi chú |
|---|---|---|---|
| Gửi email khi booking đổi trạng thái | Event Listener nội bộ (`EventEmitter2`) | Event `BookingStatusChanged` (emit khi accept/reject/sửa booking) | Gửi cho User khi booking chuyển `ACCEPTED` / `REJECTED` / đổi thông tin (ngày, phòng...). Mỗi lần gửi tạo 1 record trong `email-logs`. |
| Gửi email kích hoạt tài khoản | Event Listener nội bộ (`EventEmitter2`) | Event `UserRegistered` (emit khi `POST /auth/register` thành công) | Sinh token kích hoạt, gửi link `GET /auth/activate?token=`. |
| 🆕 Gửi email đặt lại mật khẩu | Event Listener nội bộ (`EventEmitter2`) | Event `PasswordResetRequested` (emit khi `POST /auth/forgot-password` thành công, kể cả khi email không tồn tại — vẫn trả response giống nhau để tránh lộ thông tin tài khoản nào tồn tại) | Sinh reset token, gửi link `POST /auth/reset-password` (FE mở `/reset-password?token=`). |
| 🆕 Gửi email khi đánh giá bị Admin xoá | Event Listener nội bộ (`EventEmitter2`) | Event `ReviewDeleted` (emit khi `DELETE /admin/reviews/:id` thành công, payload chỉ gồm `reviewId` + `userId` chủ review) | Thông báo cho User biết đánh giá của họ đã bị gỡ, dùng **1 template email cố định** (không có phần lý do tuỳ chỉnh). |
| Gửi báo cáo doanh thu cuối tháng | Cron job (`@Cron`) | `@Cron('0 55 23 * * *', { timeZone: 'Asia/Ho_Chi_Minh' })`, chỉ chạy khi `isLastDayOfMonth() === true` | Tổng hợp doanh thu tháng, gửi email cho Admin. Không liên quan route FE. |

> Quy tắc chung: **mọi thay đổi liên quan tài khoản (kích hoạt, đặt lại mật
> khẩu) và mọi thay đổi trạng thái booking/review đều emit event riêng**,
> không gọi thẳng mail service trong controller/service — giữ nhất quán với
> pattern `BookingStatusChanged`/`UserRegistered` đã có, và để mỗi lần gửi
> đều tạo được record trong `email-logs` (phục vụ `GET /admin/email-logs`).

---

## Checklist trước khi chốt

- [ ] Áp dụng namespace `/admin/**` cho toàn bộ controller quản trị
      (`AdminRoomsController`, `AdminBookingsController`,
      `AdminReviewsController`, `AdminUsersController`,
      `AdminStatisticsController`, `AdminEmailLogsController`), tách khỏi
      controller public (`RoomsController`, `BookingsController`,
      `ReviewsController`).
- [ ] Bổ sung các endpoint còn 🚧: xoá avatar, danh sách booking Admin,
      accept/reject booking, danh sách review Admin, export Excel phòng.
- [ ] Implement `GET /rooms/available` bằng cách kết hợp `rooms.status =
      ACTIVE` + kiểm tra không có booking `ACCEPTED` chồng ngày (không chỉ
      lọc theo cột `status`) — xem ghi chú ở mục Rooms.
- [ ] Emit đủ 5 event gửi mail: `UserRegistered`, `PasswordResetRequested`,
      `BookingStatusChanged`, `ReviewDeleted`, + cron báo cáo doanh thu —
      xem mục 12.
- [ ] Soạn sẵn nội dung template email `ReviewDeleted` (tiêu đề + nội dung
      cố định, không có phần lý do tuỳ chỉnh) — xem mục 12 và mục Admin
      Reviews.
- [ ] Đảm bảo `GET /bookings/:id` chặn user xem booking không phải của mình
      (403), khác với `GET /admin/bookings/:id` không bị chặn theo chủ sở
      hữu.
- [ ] Cân nhắc endpoint public `GET /rooms/:id/reviews` để trang chi tiết
      phòng hiển thị đánh giá (hiện chưa có trong yêu cầu gốc).
- [ ] Đối chiếu lại với `frontend/docs/CAU_TRUC_ROUTE.md` sau khi đổi
      namespace admin — đã rà, xem mục "Đối chiếu với FE" bên dưới.
- [ ] Viết chung 1 `ResponseInterceptor` (bọc `{statusCode, message, data}`
      cho response thành công) + `HttpExceptionFilter` toàn app theo đúng
      format đã chốt ở mục "Response envelope", áp dụng cho mọi controller
      ngay từ đầu để tránh phải sửa lại từng endpoint sau này.
- [ ] Đảm bảo `POST /bookings` và `PATCH /bookings/:id` trả `409 Conflict`
      đúng chuẩn khi phát hiện trùng lịch (race condition).
- [ ] Rà toàn bộ message trong `ResponseInterceptor`/`HttpExceptionFilter`
      và mọi service dùng `I18nService` để lấy `message` qua key, không
      hardcode chuỗi — bổ sung đủ key cho `vi`/`en` trong
      `src/i18n/*/messages.json` theo từng endpoint ở bảng trên.
- [ ] FE gắn header `x-lang` theo ngôn ngữ hiện tại vào `axiosClient`
      (cùng chỗ gắn JWT) — xem mục "i18n cho message" ở trên.

## Đối chiếu với route FE (`frontend/docs/CAU_TRUC_ROUTE.md`)

Đã rà lại toàn bộ route FE với danh sách API đã cập nhật — **đủ**, không có
route FE nào thiếu API tương ứng. Riêng vài điểm cần bổ sung ghi chú nhỏ vào
tài liệu route FE (không đổi cấu trúc route):

- `/admin/rooms/new` và `/admin/rooms/:roomId/edit` → gọi
  `POST /admin/rooms` và `PATCH /admin/rooms/:id`.
- `/admin/bookings/:bookingId` → gọi `GET /admin/bookings/:id`, 2 nút
  Từ chối/Chấp nhận gọi `PATCH /admin/bookings/:id/reject` và `.../accept`.
- `/admin/email-logs/:logId` → có thêm nút **"Gửi lại"** khi log ở trạng thái
  `FAILED`, gọi `POST /admin/email-logs/:id/retry` (route FE không đổi, chỉ
  thêm 1 action trong trang chi tiết).
- Trang chi tiết phòng `/rooms/:roomId` (public) — nếu chốt dùng thêm
  `GET /rooms/:id/reviews`, không cần thêm route FE mới, chỉ là 1 API được
  gọi thêm trong cùng trang.
