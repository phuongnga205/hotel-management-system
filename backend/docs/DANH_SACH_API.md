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
  "error": "Bad Request",
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

| Chức năng                          | Method | URL                            | Quyền                                            | Auth                                                                                                                           |
| ---------------------------------- | ------ | ------------------------------ | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| Đăng ký                            | POST   | `/api/v1/auth/register`        | Guest                                            | Không cần                                                                                                                      |
| Kích hoạt tài khoản (nhập OTP tay) | POST   | `/api/v1/auth/activate`        | Guest                                            | Không cần (body `{ email, otp }`, `ActivateAccountDto` — `otp` là chuỗi số đúng 6 ký tự, xem `frontend/docs/bridge.md`)        |
| Đăng nhập                          | POST   | `/api/v1/auth/login`           | Guest                                            | Không cần                                                                                                                      |
| Đăng xuất                          | POST   | `/api/v1/auth/logout`          | User                                             | JWT                                                                                                                            |
| Quên mật khẩu                      | POST   | `/api/v1/auth/forgot-password` | Guest                                            | Không cần (body `{ email }`, `ForgotPasswordDto` — luôn trả response giống nhau kể cả email không tồn tại, tránh lộ thông tin) |
| Đặt lại mật khẩu                   | POST   | `/api/v1/auth/reset-password`  | Guest (xác thực bằng `email` + `otp` trong body) | Không cần (body `{ email, otp, newPassword }`, `ResetPasswordDto`)                                                             |

> **Chốt: kích hoạt tài khoản và đặt lại mật khẩu dùng OTP 6 số gửi qua
> email, không dùng link kèm token.** User tự mở app, vào route
> `/activate` hoặc `/reset-password` và gõ tay email + OTP (xem
> `frontend/docs/CAU_TRUC_ROUTE.md`). Do đó `GET /auth/activate?token=`
> (kiểu cũ) không còn dùng — thay bằng `POST /auth/activate` nhận body,
> nhất quán với `ResetPasswordDto` đã có sẵn ở `bridge.md` từ trước (2 tài
> liệu trước đây mô tả lệch nhau — link/token ở đây, OTP ở `bridge.md` — nay
> đã thống nhất theo OTP).
>
> **Lưu OTP ở Redis, không có bảng Postgres riêng.** Bảng `auth_tokens` (dự
> định ban đầu cho việc này, xem `backend/db.md`) đã bị xoá hẳn (migration
> `DropAuthTokensTable`) — team quyết định mọi loại token có TTL (JWT
> blacklist khi logout, và giờ cả OTP) đều lưu Redis, không persist Postgres.
> BE đã implement `/auth/activate`, `/auth/forgot-password`, `/auth/reset-password`
> bằng `TokenUtil.saveOtp`/`verifyOtp`/`consumeOtp`
> (`src/token/token.util.ts`), **không** tạo lại entity/table cho việc này.
> OTP có TTL cấu hình bằng `OTP_TTL_SECONDS` (mặc định 600 giây). Cả ba
> endpoint đã có DTO validation, Swagger và event gửi email, xem mục 14.

## 2. Users (self-service)

| Chức năng                   | Method | URL                         | Quyền | Auth |
| --------------------------- | ------ | --------------------------- | ----- | ---- |
| Xem thông tin cá nhân       | GET    | `/api/v1/users/me`          | User  | JWT  |
| Chỉnh sửa thông tin cá nhân | PATCH  | `/api/v1/users/me`          | User  | JWT  |
| Đổi mật khẩu (đã đăng nhập) | PATCH  | `/api/v1/users/me/password` | User  | JWT  |
| Thêm/thay ảnh đại diện      | POST   | `/api/v1/users/me/avatar`   | User  | JWT  |
| Xoá ảnh đại diện            | DELETE | `/api/v1/users/me/avatar`   | User  | JWT  |

> **Đã implement (Cloudinary)**: file ảnh gửi dạng `multipart/form-data`
> (field `file`, JPG/PNG/WEBP, tối đa `AVATAR_MAX_FILE_SIZE_BYTES`). Lưu
> trên Cloudinary với `public_id` cố định `avatars/user-<userId>` +
> `overwrite: true` — mỗi user chỉ 1 slot ảnh, thay avatar = ghi đè, không
> cần lưu `public_id` riêng trong DB (khác room images bên dưới, xem mục 7).
> `avatarUrl` lưu trong `users.avatar_url` là URL tuyệt đối trên CDN
> Cloudinary, không phải path local.

## 3. Rooms (public / user)

| Chức năng                                      | Method | URL                       | Quyền        | Auth      |
| ---------------------------------------------- | ------ | ------------------------- | ------------ | --------- |
| Xem danh sách phòng (hỗ trợ filter)            | GET    | `/api/v1/rooms`           | Guest / User | Không cần |
| Tìm phòng còn trống theo thời gian + tiện nghi | GET    | `/api/v1/rooms/available` | Guest / User | Không cần |
| Xem chi tiết phòng                             | GET    | `/api/v1/rooms/:id`       | Guest / User | Không cần |

> **Giữ `/rooms/available`, không gộp vào cột `status`**: cột `rooms.status`
> (varchar/enum: `ACTIVE` / `INACTIVE` / `MAINTENANCE`) chỉ phản ánh **trạng
> thái tĩnh** của phòng (phòng có đang được vận hành hay không), không biết
> gì về **khoảng ngày cụ thể** người dùng đang tìm. Một phòng `status =
ACTIVE` vẫn có thể đã kín lịch cho tuần sau vì đã có booking `ACCEPTED`
> trùng ngày — điều này chỉ xác định được bằng cách join/kiểm tra bảng
> `bookings` (không có overlap ngày `checkIn`–`checkOut` với booking đã
> accepted), chứ không đọc được từ 1 cột status trên bảng `rooms`.
> Vậy `GET /rooms/available?checkIn=&checkOut=&amenities=...` nên implement
> = lọc `rooms.status = ACTIVE` **kết hợp** không tồn tại booking `ACCEPTED`
> chồng ngày trong khoảng yêu cầu — 2 điều kiện độc lập, không thể thay thế
> nhau, nên endpoint riêng vẫn cần giữ.

> **Đã implement**: cả 3 endpoint đều dùng chung envelope
> `{statusCode, message, data}` (mục "Response envelope" ở trên), pagination
> `page`/`limit` (không phải `skip`/`take`), list trả `data.items` +
> `total`/`page`/`limit`/`totalPages`.
>
> - `GET /rooms` và `GET /rooms/:id` (public): **chỉ trả phòng
>   `status = ACTIVE`** — ép cứng ở service, không nhận `status` từ query
>   client. Khác `GET /admin/rooms` (mục 6): admin thấy được cả
>   `INACTIVE`/`MAINTENANCE`, có thêm query `status` optional để tự lọc.
> - `GET /rooms/available`: `checkIn`/`checkOut` là **bắt buộc** (400 nếu
>   thiếu, hoặc nếu `checkOut <= checkIn`) — khác 2 endpoint kia, tìm phòng
>   "còn trống" luôn phải gắn với 1 khoảng ngày cụ thể.
> - Cả 3 endpoint (và toàn bộ `/admin/rooms/**` ở mục 6) đều trả kèm
>   `data.items[].amenities` (`{id, name}[]`) và `data.items[].images`
>   (`{id, roomId, imageUrl, isThumbnail, createdAt}[]`, xem mục 7) trong
>   response phòng — không cần gọi thêm API riêng để lấy 2 danh sách này.
>
> **🆕 Query `guests` (optional) — lọc theo sức chứa phòng.** Cả
> `GET /rooms` và `GET /rooms/available` đều nhận thêm `guests` (số nguyên
> ≥ 1) — khi có, chỉ trả phòng có `rooms.capacity >= guests`. Trước đây
> `rooms.capacity` tồn tại trong DB nhưng chưa từng được dùng để lọc ở bất
> kỳ endpoint nào; giờ đã nối vào cả 2 list endpoint (không áp dụng cho
> `GET /admin/rooms` — admin không cần tìm theo sức chứa). Xem thêm mục 4
> (`guests` giờ cũng là field bắt buộc khi tạo booking, được validate lại
> lần nữa ở đúng phòng cụ thể lúc `POST /bookings`).

## 4. Bookings (user)

| Chức năng                                                 | Method | URL                           | Quyền                  | Auth |
| --------------------------------------------------------- | ------ | ----------------------------- | ---------------------- | ---- |
| Tạo request đặt phòng                                     | POST   | `/api/v1/bookings`            | User                   | JWT  |
| Xem chi tiết request đặt phòng của chính mình             | GET    | `/api/v1/bookings/:id`        | User (chỉ chủ booking) | JWT  |
| Xem lịch sử các request của tôi                           | GET    | `/api/v1/bookings/me`         | User                   | JWT  |
| Chỉnh sửa request đặt phòng (chỉ khi đang `PENDING`)      | PATCH  | `/api/v1/bookings/:id`        | User (chủ booking)     | JWT  |
| Huỷ request đặt phòng (kèm lý do, chỉ khi đang `PENDING`) | PATCH  | `/api/v1/bookings/:id/cancel` | User (chủ booking)     | JWT  |
| Thanh toán request đặt phòng (chỉ khi đang `PENDING`)     | POST   | `/api/v1/bookings/:id/pay`    | User (chủ booking)     | JWT  |

> **Booking không thuộc về user hiện tại → `404 Not Found`, không phải
> `403`.** Đây là lựa chọn có chủ đích (tránh lộ thông tin "booking này tồn
> tại nhưng không phải của bạn" cho kẻ dò id) — `GET /bookings/:id`,
> `PATCH /bookings/:id`, `.../cancel`, `.../pay` đều scope theo
> `WHERE id = :id AND user_id = :userId` (`userId` lấy từ JWT qua
> `@GetUser('id')`, không nhận từ body/param) rồi trả `404` nếu không khớp,
> chứ không tách riêng bước check quyền sở hữu để trả `403`. Khác hẳn
> `GET /admin/bookings/:id` (mục 8) — không giới hạn theo chủ sở hữu.

> **🆕 `guests` (số khách) — bắt buộc khi tạo, cố định sau khi tạo.**
> `POST /bookings` nhận thêm field bắt buộc `guests` (số nguyên ≥ 1),
> validate `guests <= room.capacity` ngay tại thời điểm tạo — trả `400`
> (`BOOKING.GUESTS_EXCEED_CAPACITY`) nếu vượt sức chứa phòng. **`totalPrice`
> giờ tính theo cả số khách**: `totalPrice = nights × pricePerNight ×
guests` (trước đây chỉ `nights × pricePerNight`, không phụ thuộc số
> người ở). `guests` được lưu lại trên booking (cột `bookings.guests`,
> migration `AddGuestsToBookings`) và trả về trong mọi response
> (`BookingResponseDto.guests`) — nhưng **KHÔNG có trong
> `PATCH /bookings/:id`** (`UpdateBookingDto` không nhận field này): số
> khách cố định ngay từ lúc tạo, muốn đổi phải huỷ và đặt lại. `PATCH
/bookings/:id` (sửa ngày/note) vẫn validate lại `guests` cũ so với
> `room.capacity` mỗi lần sửa (phòng phòng trường hợp sau này cho đổi
> phòng), và tính lại `totalPrice` theo `guests` cũ × số đêm mới.

> **Đã implement đầy đủ — kể cả `POST /bookings/:id/pay`** (không còn là
> stub). Body chỉ nhận `{ method }` (`PaymentMethod`), **không có field
> `amount`** — số tiền luôn lấy từ `booking.totalPrice` ở server, không tin
> dữ liệu tiền từ FE. Thanh toán hiện là **mock**: luôn trả `SUCCESS` ngay
> lập tức (không gọi cổng thanh toán thật), nhưng tạo `Payment` thật trong
> DB — luồng dữ liệu (entity, transaction) đã sẵn sàng để nối cổng thanh
> toán thật sau này chỉ bằng cách thay phần "luôn SUCCESS" bằng gọi API
> cổng thanh toán thực tế.
>
> **🆕 2 tình huống hợp lệ để gọi `.../pay`** (bảng phía trên ghi gọn "chỉ
> khi đang PENDING" nhưng thực ra rộng hơn — FE cần tính đúng cả 2 khi hiện
> nút "Thanh toán"):
>
> 1. Booking đang `PENDING` **và** hold còn hạn → thanh toán xong tự chuyển
>    `booking.status → ACCEPTED`, xoá hold.
> 2. Booking đã `ACCEPTED` nhưng **chưa có payment nào `SUCCESS`** (ví dụ
>    Admin `accept` thẳng trước khi khách kịp trả tiền — mục 8) → coi là
>    "thanh toán bù", **không đổi status** (đã `ACCEPTED` sẵn), không giới
>    hạn bởi hold 10 phút, chỉ tạo thêm 1 `Payment SUCCESS` mới gắn với
>    booking đó.
>
> Trả `409 Conflict` nếu: booking đã `REJECTED`/`CANCELLED`/`EXPIRED`
> (không case nào ở trên áp dụng được); booking `PENDING` nhưng hold đã hết
> hạn; hoặc booking đã có sẵn 1 payment `SUCCESS` từ trước (chặn trả trùng
> lần 2, áp dụng cho cả 2 case).
>
> **Cơ chế giữ chỗ (hold) 10 phút, chống race condition đặt trùng phòng**
> (xem thêm `frontend/docs/bridge.md` mục `bookings`):
>
> - `POST /bookings` set `holdExpiresAt = now + 10 phút` (hằng số
>   `BOOKING_HOLD_MINUTES`, `backend/src/bookings/constants/booking.constants.ts`).
>   Trong 10 phút đó, booking được giải quyết bằng 1 trong 3 cách — thanh
>   toán thành công (`.../pay` → tự `ACCEPTED`), admin accept, hoặc admin
>   reject (mục 8) — ai xong trước thì thắng.
> - Hết 10 phút mà vẫn `PENDING` → 1 cron job (`@Cron(EVERY_MINUTE)` trong
>   `BookingsService.expireStaleHolds()`) tự bulk-update sang `EXPIRED`,
>   nhả chỗ cho người khác — dùng `QueryBuilder.update()` trực tiếp, không
>   load rồi save từng dòng.
> - Overlap-check khi tạo/sửa booking chỉ coi 1 booking là "đang giữ chỗ"
>   khi `ACCEPTED`, hoặc `PENDING` **và** `hold_expires_at` còn hiệu lực —
>   1 hold đã hết hạn (dù cron chưa kịp quét) sẽ không chặn người khác đặt
>   cùng phòng/ngày nữa. Ràng buộc `EXCLUDE` cấp DB (đã có từ migration ban
>   đầu, xem `backend/db.md`) là lưới an toàn cuối cùng cho race condition
>   thật giữa 2 request đồng thời (Postgres tự chặn 1 trong 2 `INSERT`
>   trùng nhau) — vẫn giữ nguyên `409 Conflict` như mục "Response envelope"
>   đã mô tả.
> - `update()`/`cancel()`/`accept()`/`reject()`/`pay()` đều bọc trong
>   `dataSource.transaction()` + khoá `pessimistic_write`
>   (`SELECT ... FOR UPDATE`) khi đọc booking — chống trường hợp 2 request
>   cùng sửa 1 booking (VD user `pay()` và admin `reject()` cùng lúc) đọc
>   cùng lúc thấy `PENDING` rồi ghi đè nhau mà không ai báo lỗi.

## 4a. Payments (user)

| Chức năng                                           | Method | URL                   | Quyền | Auth |
| --------------------------------------------------- | ------ | --------------------- | ----- | ---- |
| Xem lịch sử thanh toán của chính mình (mọi booking) | GET    | `/api/v1/payments/me` | User  | JWT  |

> **Đã implement ở BE — `PaymentsController`**
> (`backend/src/payments/payments.controller.ts`, tách khỏi
> `AdminPaymentsController` cùng pattern `BookingsController`/
> `AdminBookingsController`). ✅ **FE đã dựng UI** — `PaymentHistoryPage.tsx`
> (`/payments`, `paymentApi.listMine()`), xem
> `frontend/docs/DANH_SACH_MAN_HINH.md` mục E và
> `frontend/docs/CAU_TRUC_ROUTE.md`.
>
> - KHÔNG scope theo 1 booking cụ thể — trả **toàn bộ** payment của user
>   hiện tại, gộp từ mọi booking họ từng có (giống cách `GET /bookings/me`
>   không scope theo phòng). `userId` lấy từ JWT qua `@GetUser('id')`, không
>   nhận từ query/param (Luật 5).
> - Query: `page`, `limit` (cùng quy ước `.offset()/.limit()`, không
>   `.skip()/.take()`), `status`, `method` (optional, giống bản Admin).
> - Response mỗi item kèm tóm tắt booking (`booking.roomName`,
>   `booking.roomNumber`, `booking.checkInDate`, `booking.checkOutDate`) để
>   phân biệt giao dịch nào ứng với booking nào — **không** kèm thông tin
>   khách (khác bản Admin) vì user tự biết đó là chính mình.
> - Implement trong `PaymentsService.findAllForUser(userId, query)` — join
>   `payment.booking` + `booking.room` bằng `QueryBuilder`, filter
>   `booking.user_id = :userId`.
>
> Mẫu response:
>
> ```jsonc
> {
>   "statusCode": 200,
>   "message": "Lấy danh sách giao dịch thanh toán thành công.",
>   "data": {
>     "items": [
>       {
>         "id": "12",
>         "bookingId": "1002",
>         "amount": "1440.00",
>         "method": "VNPAY",
>         "status": "SUCCESS",
>         "transactionId": "a1b2c3d4-...",
>         "paidAt": "2026-08-17T17:00:00.000Z",
>         "createdAt": "2026-08-17T17:00:00.000Z",
>         "booking": {
>           "id": "1002",
>           "roomName": "Ocean View Suite",
>           "roomNumber": "202",
>           "checkInDate": "2026-08-20",
>           "checkOutDate": "2026-08-23",
>         },
>       },
>     ],
>     "page": 1,
>     "limit": 10,
>     "total": 5,
>     "totalPages": 1,
>   },
> }
> ```

## 5. Reviews (user)

| Chức năng | Method | URL | Quyền | Auth |
|---|---|---|---|---|
| Tạo đánh giá cho phòng đã đặt | POST | `/api/v1/reviews` | User | JWT |
| Xem đánh giá của chính mình (mọi phòng) | GET | `/api/v1/reviews/me` | User | JWT |
| Xem đánh giá công khai theo phòng | GET | `/api/v1/rooms/:roomId/reviews` | Guest / User | Không cần |

> **Đã implement**, tách controller trong `ReviewsModule`:
> `ReviewsController` (`POST /reviews` + `GET /reviews/me`, cần JWT),
> `RoomReviewsController` (`GET /rooms/:roomId/reviews`, public — **không**
> gắn `JwtAuthGuard`, kể cả khách chưa đăng nhập cũng gọi được),
> `AdminReviewsController` (mục 10). Dùng chung envelope
> `{statusCode, message, data}`, pagination `page`/`limit`, list trả
> `data.items` + `total`/`page`/`limit`/`totalPages` — giống mọi list
> endpoint khác. URL `GET /rooms/:roomId/reviews` khớp đúng
> `frontend/src/api/endpoints.ts` (`ROOM_REVIEWS`) — **route nested dưới
> `/rooms` nhưng sở hữu bởi `ReviewsModule`** (đọc thẳng `Review`
> repository), không phải `RoomsModule`.
>
> **🆕 `GET /reviews/me`**: self-service, scope theo `userId` lấy từ JWT
> (`@GetUser`, không nhận từ query — cùng nguyên tắc với
> `GET /bookings/me`/`GET /payments/me`), gộp đánh giá của user hiện tại từ
> **mọi phòng** (không giới hạn 1 phòng cụ thể, khác `GET /rooms/:roomId/reviews`).
> Thêm vì lúc đầu định để FE tự ghép từ `GET /bookings/me` +
> `GET /rooms/:roomId/reviews` cho từng phòng khác nhau (N+1 request, không
> có field nào định danh "review của tôi" ngoài suy luận qua `bookingId`) —
> quyết định làm hẳn 1 API riêng cho gọn và đúng chuẩn `*/me` đã có, thay vì
> để FE gánh logic ghép nối. Response giờ có thêm field `room` (optional —
> `{id, name, roomNumber, thumbnailUrl}`, chỉ có ở endpoint này vì các
> endpoint kia đã biết sẵn phòng nào qua URL/context) trong
> `ReviewResponseDto`, join kèm `room.images` để không phải gọi thêm request
> lấy ảnh đại diện phòng riêng (tránh N+1). FE tiêu thụ ở `MyReviewsPage.tsx`
> (`/reviews`, tab "My Reviews" ngang hàng "My Bookings" trên header) qua
> `reviewApi.listMine()`.

---

## 6. Admin — Rooms

| Chức năng                                                 | Method | URL                                            | Quyền | Auth                    |
| --------------------------------------------------------- | ------ | ---------------------------------------------- | ----- | ----------------------- |
| Xem danh sách phòng (đầy đủ, gồm cả inactive/maintenance) | GET    | `/api/v1/admin/rooms`                          | Admin | JWT + RolesGuard(ADMIN) |
| Xem chi tiết 1 phòng (view quản trị)                      | GET    | `/api/v1/admin/rooms/:id`                      | Admin | JWT + RolesGuard(ADMIN) |
| Tạo phòng                                                 | POST   | `/api/v1/admin/rooms`                          | Admin | JWT + RolesGuard(ADMIN) |
| Chỉnh sửa thông tin phòng                                 | PATCH  | `/api/v1/admin/rooms/:id`                      | Admin | JWT + RolesGuard(ADMIN) |
| Cập nhật riêng giá phòng                                  | PATCH  | `/api/v1/admin/rooms/:id/price`                | Admin | JWT + RolesGuard(ADMIN) |
| Gán tiện nghi cho phòng                                   | POST   | `/api/v1/admin/rooms/:id/amenities`            | Admin | JWT + RolesGuard(ADMIN) |
| Gỡ 1 tiện nghi khỏi phòng                                 | DELETE | `/api/v1/admin/rooms/:id/amenities/:amenityId` | Admin | JWT + RolesGuard(ADMIN) |
| Xoá phòng                                                 | DELETE | `/api/v1/admin/rooms/:id`                      | Admin | JWT + RolesGuard(ADMIN) |
| Export danh sách phòng ra Excel                           | GET    | `/api/v1/admin/rooms/export`                   | Admin | JWT + RolesGuard(ADMIN) |

> **Đã implement.** `GET /admin/rooms` trả **mọi status** (mặc định không
> lọc), có thêm query `status` optional để admin tự thu hẹp theo 1 trạng
> thái. `roomType` là field tự do (`varchar`, không phải bảng danh mục
> riêng) — set/sửa được qua `CreateRoomDto`/`UpdateRoomDto` khi
> tạo/sửa phòng, không có endpoint quản lý danh mục riêng cho nó.
>
> **🆕 3 dòng bổ sung (có trong code, trước đây thiếu trong bảng này)**:
>
> - `PATCH /admin/rooms/:id/price` (`UpdateRoomPriceDto`) — cập nhật riêng
>   `pricePerNight`, tách khỏi `PATCH /admin/rooms/:id` (sửa thông tin
>   chung). Dùng khi FE chỉ cần đổi giá mà không đụng các field khác.
> - `POST /admin/rooms/:id/amenities` (`UpdateRoomAmenitiesDto`, body
>   `{ amenityIds: string[] }`) và
>   `DELETE /admin/rooms/:id/amenities/:amenityId` — đây chính là "2 API
>   riêng" đã được nhắc tới ở mục 13 ("xem mục 6") nhưng trước đây chưa
>   thực sự có dòng nào trong bảng ở mục 6 — nay bổ sung cho khớp code
>   (`AdminRoomsController.addAmenities()`/`removeAmenity()`).

## 7. Admin — Room Images

| Chức năng                                    | Method | URL                                                 | Quyền | Auth                    |
| -------------------------------------------- | ------ | --------------------------------------------------- | ----- | ----------------------- |
| Upload 1 ảnh cho 1 phòng                     | POST   | `/api/v1/admin/rooms/:id/images`                    | Admin | JWT + RolesGuard(ADMIN) |
| Xoá 1 ảnh của phòng                          | DELETE | `/api/v1/admin/rooms/:id/images/:imageId`           | Admin | JWT + RolesGuard(ADMIN) |
| Đặt 1 ảnh (đã upload) làm ảnh đại diện phòng | PATCH  | `/api/v1/admin/rooms/:id/images/:imageId/thumbnail` | Admin | JWT + RolesGuard(ADMIN) |

> **Đã implement — ảnh phòng lưu Cloudinary**, đồng bộ cách avatar user đang
> lưu (đã bỏ hẳn phương án lưu local disk từng dùng ở 1 nhánh trước đó —
> `ROOM_UPLOAD_DIRECTORY`, `useStaticAssets` không còn tồn tại trong code).
> Lý do đổi: team làm việc nhiều máy, ảnh phải nằm ở 1 nơi dùng chung (CDN),
> không thể là đĩa cục bộ của máy chạy backend.
>
> **Khác avatar user ở chỗ nào**: `users.avatar_url` là 1 slot cố định/user
> nên `public_id` Cloudinary suy ra được trực tiếp từ `userId`
> (`avatars/user-<userId>`). Room có **N ảnh/phòng** nên `public_id` phải
> duy nhất theo từng ảnh — dạng `rooms/room-<roomId>/<uuid>`
> (`buildRoomImagePublicId()`, xem `config/environment.constants.ts`) — và
> **bắt buộc** lưu lại `image_public_id` riêng từng dòng (cột đã có, xem
> `backend/db.md`) để biết đúng asset nào cần xoá khi gọi
> `DELETE .../images/:imageId`.
>
> **Multipart upload**: `FileInterceptor` (1 file/request, field `file`),
> Multer dùng `memoryStorage` (giữ file trong RAM, không ghi đĩa) —
> `RoomImageValidationPipe` validate kích thước + MIME type + magic byte
> nội dung file (không tin mimetype client khai) trên buffer, sau đó
> `RoomsService.addImage()` mới gọi Cloudinary. Chưa hỗ trợ upload nhiều
> ảnh 1 lần (`FilesInterceptor`) — mỗi lần upload 1 ảnh.
>
> **Đổi ảnh đại diện phòng (`isThumbnail`) cần transaction**: unset ảnh
> thumbnail cũ + set ảnh mới là 2 thao tác ghi DB — khác avatar/hầu hết
> endpoint khác trong hệ thống (chỉ 1 thao tác ghi/lần), đây là chỗ **bắt
> buộc bọc transaction** theo quy tắc DB của dự án, cả khi đặt thumbnail lúc
> upload (`isThumbnail: true` trong body `POST .../images`) lẫn khi đặt
> thumbnail cho 1 ảnh đã tồn tại (`PATCH .../images/:imageId/thumbnail`).
> DB đã có sẵn lưới an toàn `uq_images_one_thumbnail_per_room` (unique
> partial index) chống race condition nếu 2 request đổi thumbnail cùng lúc.
>
> **Dọn rác Cloudinary khi xoá ảnh/xoá phòng**: `DELETE .../images/:imageId`
> và `DELETE /admin/rooms/:id` đều xoá asset Cloudinary tương ứng
> (`CloudinaryService.destroy()`) sau khi soft-delete DB thành công —
> best-effort, không rollback DB nếu Cloudinary lỗi.
>
> **`ImagesModule` (`src/images/`)** giờ chỉ còn export `Image` entity cho
> `RoomsModule` dùng — không còn `ImagesController`/`ImagesService` riêng
> (đã xoá ở 1 nhánh trước, toàn bộ logic ảnh nằm trong `RoomsService`).

## 8. Admin — Bookings

| Chức năng                                                                               | Method | URL                                 | Quyền | Auth                    |
| --------------------------------------------------------------------------------------- | ------ | ----------------------------------- | ----- | ----------------------- |
| Xem danh sách toàn bộ booking (mọi user, filter `status`/`search`, phân trang)          | GET    | `/api/v1/admin/bookings`            | Admin | JWT + RolesGuard(ADMIN) |
| Xem chi tiết booking (view quản trị, gồm thông tin user đặt, không giới hạn chủ sở hữu) | GET    | `/api/v1/admin/bookings/:id`        | Admin | JWT + RolesGuard(ADMIN) |
| Chấp nhận request đặt phòng (chỉ khi đang `PENDING`)                                    | PATCH  | `/api/v1/admin/bookings/:id/accept` | Admin | JWT + RolesGuard(ADMIN) |
| Từ chối request đặt phòng (kèm lý do, chỉ khi đang `PENDING`)                           | PATCH  | `/api/v1/admin/bookings/:id/reject` | Admin | JWT + RolesGuard(ADMIN) |

> **Đã implement — `AdminBookingsController`** (`backend/src/bookings/admin-bookings.controller.ts`),
> tách controller riêng khỏi `BookingsController` (self-service của khách)
> nhưng dùng chung 1 `BookingsService`, đúng pattern `RoomsController`/
> `AdminRoomsController` ở mục 6.
>
> - `GET /admin/bookings` dùng `QueryBuilder` + `.offset()/.limit()` (không
>   dùng `.skip()/.take()` — né đúng vấn đề TypeORM tính sai số dòng khi kết
>   hợp `skip/take` với `leftJoinAndSelect` một quan hệ 1-nhiều), trả kèm
>   `data.items[].payment` (trạng thái thanh toán mới nhất của mỗi booking,
>   lấy bằng 1 query gộp riêng theo `bookingId IN (...)` thay vì join trực
>   tiếp `booking.payments` — tránh N+1 lẫn tránh lỗi nhân dòng do join
>   1-nhiều kết hợp phân trang).
> - `PATCH .../accept` và `.../reject` chỉ áp dụng được khi booking đang
>   `PENDING` (400 nếu không), không kiểm tra `payment.status` — theo thiết
>   kế, 1 booking `PENDING` không thể có `Payment SUCCESS` đi kèm (thanh
>   toán thành công qua `.../pay` luôn atomically chuyển sang `ACCEPTED`
>   trong cùng transaction).
> - Trùng lý do reject và cancel: cả 2 dùng chung cột `bookings.cancel_reason`
>   (xem `backend/db.md` và `bridge.md` mục `bookings`).

## 9. Admin — Users

| Chức năng                                                   | Method | URL                       | Quyền | Auth                    |
| ----------------------------------------------------------- | ------ | ------------------------- | ----- | ----------------------- |
| Tạo người dùng mới                                          | POST   | `/api/v1/admin/users`     | Admin | JWT + RolesGuard(ADMIN) |
| Xem danh sách người dùng                                    | GET    | `/api/v1/admin/users`     | Admin | JWT + RolesGuard(ADMIN) |
| Xem chi tiết người dùng                                     | GET    | `/api/v1/admin/users/:id` | Admin | JWT + RolesGuard(ADMIN) |
| Chỉnh sửa thông tin người dùng (gồm cả đổi trạng thái/role) | PATCH  | `/api/v1/admin/users/:id` | Admin | JWT + RolesGuard(ADMIN) |
| Xoá người dùng                                              | DELETE | `/api/v1/admin/users/:id` | Admin | JWT + RolesGuard(ADMIN) |

> 🆕 **Optional — vượt phạm vi tối thiểu ban đầu của mục này** (bản đầu chỉ
> định nghĩa 3 API: xem danh sách/chi tiết + đổi trạng thái qua
> `PATCH .../status`). `AdminUsersController`
> (`backend/src/users/admin-users.controller.ts`) đã implement đầy đủ CRUD
> thay vì chỉ 3 API đó — đã hoàn thiện, sẵn dùng, không bắt buộc FE phải làm
> UI ngay nếu chưa cần:
>
> - `POST /admin/users` — Admin tạo tài khoản mới, tài khoản được **kích
>   hoạt ngay** (`status=ACTIVE`, `activatedAt` được set), khác với
>   `POST /auth/register` (phải qua OTP kích hoạt).
> - `PATCH /admin/users/:id` — **thay cho** `.../status` dự kiến ban đầu:
>   nhận `AdminUpdateUserDto` (`username`, `email`, `fullName`, `phone`,
>   `role`, `status`), đổi được bất kỳ field nào — kể cả riêng `status` bằng
>   cách chỉ gửi `{ "status": "..." }` — trong 1 endpoint duy nhất, không cần
>   route con `/status` riêng.
> - `DELETE /admin/users/:id` — **xoá mềm** (`@DeleteDateColumn`), không xoá
>   cứng, giống quy ước xoá mềm dùng chung toàn hệ thống.
>
> FE hiện **chưa có trang nào gọi `POST`/`DELETE` này** (xem
> `frontend/docs/DANH_SACH_MAN_HINH.md` mục F) — 2 API này coi là optional,
> làm UI khi cần (vd nút "Tạo người dùng" ở trang danh sách, nút "Xoá" ở
> trang chi tiết).

## 10. Admin — Reviews

| Chức năng                              | Method | URL                         | Quyền | Auth                    |
| -------------------------------------- | ------ | --------------------------- | ----- | ----------------------- |
| Xem danh sách đánh giá (toàn hệ thống) | GET    | `/api/v1/admin/reviews`     | Admin | JWT + RolesGuard(ADMIN) |
| Xoá đánh giá                           | DELETE | `/api/v1/admin/reviews/:id` | Admin | JWT + RolesGuard(ADMIN) |

> **Chốt**: `DELETE /admin/reviews/:id` không nhận body, chỉ cần `id` trên
> path. Email thông báo cho User (event `ReviewDeleted`, xem mục 14) dùng
> **1 mẫu (template) cố định**, không có phần lý do tuỳ chỉnh từ Admin.
>
> **Đã implement** (`AdminReviewsController`, `/admin/reviews`), chỉ
> `page`/`limit` — 🚧 **chưa hỗ trợ `sort`** (chưa module admin-list nào
> trong repo hỗ trợ `sort` thật, không riêng reviews).

## 11. Admin — Statistics

| Chức năng | Method | URL | Quyền | Auth |
|---|---|---|---|---|
| Thống kê doanh thu + số booking, gộp theo ngày/tháng/quý/năm | GET | `/api/v1/statistics/revenue-bookings` | Admin | JWT + RolesGuard(ADMIN) |
| Xuất thống kê doanh thu + số booking ra Excel theo kỳ đã chọn | GET | `/api/v1/statistics/revenue-bookings/export` | Admin | JWT + RolesGuard(ADMIN) |
| Danh sách giao dịch thanh toán (dùng ở bảng "Transactions" trong màn Revenue Statistics) | GET | `/api/v1/admin/payments` | Admin | JWT + RolesGuard(ADMIN) |

> ⚠️ **Đã implement, nhưng lệch hợp đồng cũ trong docs này** —
> `StatisticsModule`/`StatisticsController`
> (`backend/src/statistics/statistics.controller.ts`) đã lên code thật, khác
> với 2 route `GET /admin/statistics/bookings` và
> `GET /admin/statistics/revenue` từng ghi ở bản docs trước (chưa implement
> lúc đó). Khác biệt chính so với hợp đồng cũ:
> - **1 route gộp** `GET /statistics/revenue-bookings` trả cả doanh thu lẫn
>   số booking cùng lúc (không tách 2 endpoint `bookings`/`revenue` riêng).
> - **✅ Đã chốt: không cần tiền tố `/admin`** — route là
>   `/statistics/revenue-bookings`, vẫn khoá `RolesGuard(ADMIN)` ở cấp
>   controller nên bảo mật không đổi; chỉ khác namespace URL so với các
>   controller quản trị khác. Đây là quyết định giữ nguyên (không sửa lại
>   theo `/admin/**`), không còn là điểm cần team quyết — FE (`API_ENDPOINTS`,
>   xem dưới) đã cập nhật khớp route này.
> - **Không có breakdown theo loại phòng** (`byRoomType`) — chỉ gộp theo thời
>   gian (`period`: `DAY`/`MONTH`/`QUARTER`/`YEAR`), không lọc/gộp theo `roomType`
>   hay `status` như mô tả cũ.
> - Query bắt buộc: `period` (`DAY`/`MONTH`/`QUARTER`/`YEAR`), `year`. `month` bắt
>   buộc khi `period=DAY` (validate qua `StatisticsMonthValidator`), không
>   dùng khi `period` là `MONTH`/`QUARTER`/`YEAR`.
> - `period=YEAR&year=2026` trả một bucket tổng hợp cho riêng năm 2026. Đây
>   là báo cáo tổng năm, không phải biểu đồ so sánh nhiều năm; API không nhận
>   `fromYear`/`toYear`.
> - Endpoint `/statistics/revenue-bookings/export` dùng cùng DTO và cùng
>   kết quả đã cache với endpoint JSON. File `.xlsx` gồm sheet `Summary`
>   (tổng doanh thu, tổng booking, kỳ đã chọn) và `Breakdown` (doanh thu,
>   booking theo từng bucket thời gian).
> - Response trả **đủ nhãn (label) cho toàn bộ khoảng thời gian** (12 tháng,
>   4 quý, hoặc đủ số ngày trong tháng) kể cả bucket không có dữ liệu (revenue
>   `"0.00"`, `bookingCount` 0) — FE không cần tự điền khoảng trống.
> - `totalRevenue`/`bucket.revenue` là **string** dạng tiền tệ 2 chữ số thập
>   phân (vd `"12500000.00"`), tính bằng `bigint` ở minor units để tránh sai
>   số dấu phẩy động — FE parse bằng `Number()`/thư viện decimal khi hiển thị,
>   không cộng trừ trực tiếp trên string.
>   - "Doanh thu" chỉ tính `Payment.status = SUCCESS`, gộp theo `paidAt`.
>   - "Booking" đếm mọi booking chưa xoá mềm bất kể `status`, gộp theo
>     `createdAt`.
> - `isCached: boolean` — response được cache ở Redis theo
>   `period:year:month:timezone` (TTL cấu hình qua
>   `STATISTICS_CACHE_TTL_SECONDS`, mặc định 300s), dùng lock để tránh
>   nhiều request cùng lúc tính lại 1 khoảng thời gian (dogpile). Nếu Redis
>   lỗi, trả `503 Service Unavailable` thay vì query thẳng DB không cache —
>   có chủ đích để tránh spam truy vấn nặng.
>
> Mẫu response (`period=MONTH&year=2026`):
> ```jsonc
> {
>   "statusCode": 200,
>   "message": "...",
>   "data": {
>     "period": "MONTH",
>     "year": 2026,
>     "month": null,
>     "totalRevenue": "12500000.00",
>     "totalBookings": 24,
>     "buckets": [
>       { "label": "2026-01", "revenue": "0.00", "bookingCount": 0 },
>       { "label": "2026-08", "revenue": "12500000.00", "bookingCount": 24 }
>     ],
>     "isCached": false
>   }
> }
> ```
>
> ✅ **FE đã cập nhật theo hợp đồng mới.**
> `frontend/src/api/statistics.api.ts` gọi 1 hàm gộp
> `getRevenueAndBookings(query)` → `STATISTICS_REVENUE_BOOKINGS` =
> `/statistics/revenue-bookings` (`frontend/src/api/endpoints.ts`), type
> `RevenueBookingsStatistics`/`StatisticsQuery`/`StatisticsBucket`
> (`frontend/src/api/types.ts`) khớp đúng response BE (không còn
> `BookingStatistics`/`RevenueStatistics` kiểu cũ với `byStatus`/
> `byRoomType`). Mock (`statisticsMockApi`) cũng sinh `buckets` theo đúng
> `period`/`year`/`month`.
> - `AdminBookingStatsPage.tsx`/`AdminRevenueStatsPage.tsx` dùng chung 1
>   component chọn kỳ mới `StatisticsPeriodControls`
>   (`frontend/src/components/admin/StatisticsPeriodControls.tsx`) để chọn
>   `period`/`year`/`month`, mỗi trang tự gọi API với query riêng (không
>   share state, giống pattern phân trang "Transactions" ở trang revenue).
> - Vì BE không trả breakdown theo `status`/`roomType`, 2 chart cũ dựa trên
>   dữ liệu đó (status pie ở trang booking, room-type bar ở trang revenue)
>   đã bỏ, thay bằng chart theo `buckets` (đúng dữ liệu BE có: số booking/
>   doanh thu theo từng mốc thời gian trong kỳ đã chọn).
> - `AdminDashboardPage.tsx` cũng đổi theo: bỏ 2 tile
>   "Accepted"/pending-sub và chart "Status Breakdown" (không còn dữ liệu
>   nguồn), thay chart phân bổ trạng thái bằng "Bookings Trend" dựng từ
>   cùng `buckets` đã gọi cho chart doanh thu — không cần thêm request.
>
> **Đã implement — `PaymentsController`/`PaymentsService`**
> (`backend/src/payments/payments.controller.ts` /
> `payments.service.ts`). Chỉ có API đọc danh sách, **không có** API xem chi
> tiết 1 giao dịch riêng (`GET /admin/payments/:id`) — mỗi dòng trong bảng đã
> đủ thông tin cần thiết, không cần trang chi tiết. Việc **tạo** `Payment`
> vẫn nằm nguyên trong `BookingsService.pay()` (mục 4) vì gắn liền 1
> transaction với đổi `booking.status`, không tách qua `PaymentsService` —
> `PaymentsModule` ở đây chỉ sở hữu phần đọc.
>
> - Query: `page`, `limit` (theo đúng quy ước phân trang chung —
>   `AdminPaymentQueryDto` dùng `.offset()/.limit()`, không phải
>   `.skip()/.take()`), `status` (`PaymentStatus`, optional), `method`
>   (`PaymentMethod`, optional). Không có `search` — `Payment` không có field
>   text nào phù hợp để tìm kiếm gần đúng (`bookingId` là số, `transactionId`
>   là UUID mock).
> - Response mỗi item **kèm sẵn thông tin khách + phòng**
>   (`booking.guestName`, `booking.guestEmail`, `booking.roomName`,
>   `booking.roomNumber`) — join bằng `QueryBuilder`
>   (`leftJoinAndSelect('payment.booking', ...)` → `booking.user`/
>   `booking.room`) ngay trong `PaymentsService.findAllForAdmin()`, không cần
>   FE gọi thêm request nào khác để hiển thị bảng.
>
> Mẫu response:
>
> ```jsonc
> {
>   "statusCode": 200,
>   "message": "Lấy danh sách giao dịch thanh toán thành công.",
>   "data": {
>     "items": [
>       {
>         "id": "12",
>         "bookingId": "1002",
>         "amount": "1440.00",
>         "method": "VNPAY",
>         "status": "SUCCESS",
>         "transactionId": "a1b2c3d4-...",
>         "paidAt": "2026-08-17T17:00:00.000Z",
>         "createdAt": "2026-08-17T17:00:00.000Z",
>         "booking": {
>           "id": "1002",
>           "guestName": "Isabella Romano",
>           "guestEmail": "i.romano@mail.com",
>           "roomName": "Ocean View Suite",
>           "roomNumber": "202",
>         },
>       },
>     ],
>     "page": 1,
>     "limit": 10,
>     "total": 34,
>     "totalPages": 4,
>   },
> }
> ```

## 12. Admin — Email Log

| Chức năng                                                                                             | Method | URL                                  | Quyền | Auth                    |
| ----------------------------------------------------------------------------------------------------- | ------ | ------------------------------------ | ----- | ----------------------- |
| Xem lịch sử gửi email (lọc theo PENDING/SENT/FAILED/DELIVERED_UNCONFIRMED, phân trang `page`/`limit`) | GET    | `/api/v1/admin/email-logs`           | Admin | JWT + RolesGuard(ADMIN) |
| Xem chi tiết 1 email log                                                                              | GET    | `/api/v1/admin/email-logs/:id`       | Admin | JWT + RolesGuard(ADMIN) |
| Gửi lại email thất bại                                                                                | POST   | `/api/v1/admin/email-logs/:id/retry` | Admin | JWT + RolesGuard(ADMIN) |

## 12a. Mail — endpoint kiểm tra nội bộ (Admin)

| Chức năng                                                 | Method | URL                 | Quyền | Auth                    |
| --------------------------------------------------------- | ------ | ------------------- | ----- | ----------------------- |
| Gửi thử 1 email (verify Redis/BullMQ/Nodemailer còn sống) | POST   | `/api/v1/mail/test` | Admin | JWT + RolesGuard(ADMIN) |
| Xem trạng thái gửi 1 email theo id                        | GET    | `/api/v1/mail/:id`  | Admin | JWT + RolesGuard(ADMIN) |

> Hai route này đã được khóa bằng JWT + `RolesGuard(ADMIN)`. Không có route
> FE chính thức gọi chúng; mục đích là kiểm tra hạ tầng mail có kiểm soát.

---

## 13. Admin — Amenities

| Chức năng                           | Method | URL                     | Quyền                | Auth                    |
| ----------------------------------- | ------ | ----------------------- | -------------------- | ----------------------- |
| Xem danh sách tiện nghi (catalogue) | GET    | `/api/v1/amenities`     | Guest / User / Admin | Không cần               |
| Xem chi tiết 1 tiện nghi            | GET    | `/api/v1/amenities/:id` | Guest / User / Admin | Không cần               |
| Tạo tiện nghi mới                   | POST   | `/api/v1/amenities`     | Admin                | JWT + RolesGuard(ADMIN) |
| Chỉnh sửa tiện nghi                 | PATCH  | `/api/v1/amenities/:id` | Admin                | JWT + RolesGuard(ADMIN) |
| Xoá tiện nghi (xoá mềm)             | DELETE | `/api/v1/amenities/:id` | Admin                | JWT + RolesGuard(ADMIN) |

> **Đã implement.** 2 API `GET` không guard — khác `POST`/`PATCH`/`DELETE`
> (Admin only) — vì FE public cần đọc catalogue tên tiện nghi để: (1) hiển
> thị badge tiện nghi trên card/trang chi tiết phòng, (2) dựng UI filter cho
> `GET /rooms/available?amenities=<tên,tên,...>` (mục 3). Route **không**
> nằm dưới `/admin/**` dù 3 thao tác ghi yêu cầu quyền Admin — khác
> `/admin/rooms` (dữ liệu/hình dạng response khác hẳn phía User), đây là 1
> catalogue dùng chung cho cả public lẫn admin; guard áp riêng ở từng
> method (`AmenitiesController`) thay vì ở cấp controller.
>
> **Vòng đời độc lập với Room.** `Amenity` không có FK bắt buộc trỏ về
> `Room` — tạo tiện nghi mới qua `POST /amenities` không cần gán ngay cho
> phòng nào, tồn tại độc lập trong catalogue tới khi được gán. Gán/gỡ tiện
> nghi cho 1 phòng cụ thể là 2 API riêng dưới `/admin/rooms/:id/amenities`
> (xem mục 6), thao tác trên bảng nối `room_amenities`, không đụng tới bản
> ghi `Amenity` gốc:
>
> - Xoá phòng (`DELETE /admin/rooms/:id`) chỉ xoá các dòng `room_amenities`
>   trỏ tới phòng đó, **không** xoá `Amenity`.
> - Xoá tiện nghi (`DELETE /amenities/:id`, xoá mềm) **không** tự động gỡ
>   khỏi các phòng đang gán nó, và hiện chưa chặn xoá 1 amenity đang được
>   ≥1 phòng sử dụng — 🚧 cân nhắc thêm check này nếu cần.

---

## 14. Sự kiện & Job nội bộ (KHÔNG phải REST API)

> Các mục này **không có URL/method HTTP**, FE **không** gọi trực tiếp. Ghi
> lại ở đây để team biết luồng gửi email tự động vận hành thế nào, tránh
> nhầm là API còn thiếu.

| Chức năng                              | Cơ chế                                          | Trigger                                                                                                                                                   | Ghi chú                                                                                                                               |
| -------------------------------------- | ----------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Gửi email khi booking đổi trạng thái   | Transactional outbox                            | `accept`, `reject`, `cancel` hoặc thanh toán làm booking chuyển `ACCEPTED` sẽ persist business data + `email_logs` + `mail_outbox` trong cùng transaction | Worker gửi bất đồng bộ; lỗi persist outbox làm rollback cả thay đổi booking nên không mất email.                                      |
| Gửi email kích hoạt tài khoản          | Transactional outbox                            | `POST /auth/register` persist User + `email_logs` + `mail_outbox` trong cùng transaction                                                                  | Sinh OTP 6 số; lỗi persist outbox làm rollback User, worker gửi email sau khi transaction commit.                                     |
| 🆕 Gửi email đặt lại mật khẩu          | Transactional outbox                            | Khi email tồn tại, `POST /auth/forgot-password` persist `email_logs` + `mail_outbox`; email không tồn tại vẫn trả cùng response để tránh lộ tài khoản     | Sinh OTP 6 số; worker gửi email bất đồng bộ và lỗi persist outbox không bị nuốt.                                                      |
| 🆕 Gửi email khi đánh giá bị Admin xoá | Transactional outbox                            | `DELETE /admin/reviews/:id` persist soft-delete + `email_logs` + `mail_outbox` trong cùng transaction                                                     | Thông báo bằng **1 subject/body cố định**; lỗi persist outbox làm rollback soft-delete.                                               |
| Gửi báo cáo doanh thu tháng            | Cron job động (`SchedulerRegistry` + `CronJob`) | `REPORT_CRON` (mặc định `55 23 28-31 * *`) theo `REPORT_TIME_ZONE`; service chỉ chạy đúng ngày cuối tháng                                                 | Tổng hợp tháng hiện tại và gửi email cho Admin qua transactional outbox. Doanh thu giữ dạng decimal string để không mất độ chính xác. |
| Khôi phục báo cáo tháng bị bỏ sót      | Recovery cron nội bộ                            | Chạy mỗi 10 phút từ 00:00–02:59 ngày đầu tháng, xử lý lại kỳ trước                                                                                        | Unique constraint theo tháng/Admin đảm bảo idempotency: chỉ Admin bị bỏ sót được tạo lại, không gửi trùng người đã có dispatch.       |

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
      `AdminEmailLogsController`), tách khỏi controller public
      (`RoomsController`, `BookingsController`, `ReviewsController`). Riêng
      Statistics **cố ý ngoại lệ**: `StatisticsController` ở `/statistics/**`
      (không `/admin/statistics/**`), xem mục 11 — đã chốt giữ nguyên, không
      cần sửa lại theo namespace này.
- [x] Bổ sung các endpoint booking Admin còn 🚧: danh sách, chi tiết,
      accept/reject — đã implement, xem mục 8.
- [x] Bổ sung endpoint còn 🚧: danh sách review Admin (`GET /admin/reviews`)
      — đã implement, tách `AdminReviewsController` khỏi `ReviewsController`
      đúng namespace `/admin/reviews`, xem mục 10. Sort vẫn để 🚧 (chưa
      module admin list nào trong repo hỗ trợ `sort` thật, không riêng
      reviews).
- [x] `GET /rooms`, `GET /rooms/available`, `GET /rooms/:id`, toàn bộ
      `/admin/rooms/**` (kể cả export Excel) đã implement — xem mục 3 và 6.
- [x] Room images (upload/xoá/đặt thumbnail) đã implement, lưu Cloudinary —
      xem mục 7.
- [x] `GET/POST/PATCH/DELETE /amenities` đã implement, gán/gỡ tiện nghi cho
      phòng qua `/admin/rooms/:id/amenities` cũng đã implement — xem mục 13.
- [x] `PATCH /admin/rooms/:id/price`, `POST /admin/rooms/:id/amenities`,
      `DELETE /admin/rooms/:id/amenities/:amenityId` — có sẵn trong code từ
      trước nhưng thiếu dòng trong bảng mục 6, đã bổ sung sau khi đối chiếu
      lại `AdminRoomsController`.
- [x] Thống kê doanh thu + booking cho Admin — đã implement, gộp thành 1
      route `GET /statistics/revenue-bookings` (không tách `bookings`/
      `revenue`, không nằm dưới `/admin/**` — quyết định giữ nguyên, xem mục
      11). FE đã cập nhật theo route + response shape mới.
- [x] `POST /mail/test`, `GET /mail/:id` (mục 12a) đã khóa ADMIN.
- [x] Emit đủ 5 event gửi mail: `UserRegistered`, `PasswordResetRequested`,
      `BookingStatusChanged`, `ReviewDeleted`, + cron báo cáo doanh thu —
      xem mục 14.
- [x] Soạn sẵn nội dung template email `ReviewDeleted` (tiêu đề + nội dung
      cố định, không chèn ID review hoặc lý do xoá) — xem mục 14 và mục Admin
      Reviews.
- [x] Đảm bảo `GET /bookings/:id` chặn user xem booking không phải của
      mình, khác với `GET /admin/bookings/:id` không bị chặn theo chủ sở
      hữu — đã implement, **nhưng trả `404` chứ không phải `403`** như dự
      kiến ban đầu ở mục này (quyết định có chủ đích để tránh lộ thông tin
      "booking tồn tại nhưng không phải của bạn", xem ghi chú ở mục 4).
- [ ] Cân nhắc endpoint public `GET /rooms/:id/reviews` để trang chi tiết
      phòng hiển thị đánh giá (hiện chưa có trong yêu cầu gốc).
- [x] `GET /admin/payments` (danh sách giao dịch thanh toán cho Admin) đã
      implement — xem mục 11.
- [x] `GET /payments/me` (lịch sử thanh toán của chính user) đã implement ở
      BE — xem mục 4a. FE đã dựng UI (route `/payments`,
      `PaymentHistoryPage.tsx`, `paymentApi.listMine()`).
- [ ] Đối chiếu lại với `frontend/docs/CAU_TRUC_ROUTE.md` sau khi đổi
      namespace admin — đã rà, xem mục "Đối chiếu với FE" bên dưới.
- [ ] Viết chung 1 `ResponseInterceptor` (bọc `{statusCode, message, data}`
      cho response thành công) + `HttpExceptionFilter` toàn app theo đúng
      format đã chốt ở mục "Response envelope", áp dụng cho mọi controller
      ngay từ đầu để tránh phải sửa lại từng endpoint sau này. Chưa có
      interceptor chung — `bookings` (giống `rooms`/`users`/`amenities`) tự
      build đúng shape này thủ công ở từng method service, không phải qua
      interceptor.
- [x] Đảm bảo `POST /bookings` và `PATCH /bookings/:id` trả `409 Conflict`
      đúng chuẩn khi phát hiện trùng lịch (race condition) — đã implement,
      kèm cơ chế giữ chỗ (hold) 10 phút + cron tự expire + khoá pessimistic
      chống race giữa các thao tác đổi trạng thái, xem ghi chú ở mục 4.
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
- `/admin/statistics/revenue` (route FE) → BE thật là
  `GET /statistics/revenue-bookings` (1 route gộp, không phải
  `/admin/statistics/revenue`, xem mục 11), gọi kèm `GET /admin/payments`
  cho bảng "Transactions" — route FE không đổi, chỉ đổi API FE gọi bên
  trong cùng 1 trang `AdminRevenueStatsPage`. ✅ FE đã sửa theo route mới.
- `/admin/statistics/bookings` (route FE, trang `AdminBookingStatsPage`) →
  BE thật cũng là `GET /statistics/revenue-bookings` (cùng 1 route gộp với
  trang revenue ở trên, không có route `bookings` riêng) — ✅ FE đã sửa.
- `/payments` (FE, user) ✅ — `GET /payments/me` đã implement ở BE (mục 4a),
  route + trang FE tương ứng đã dựng (`PaymentHistoryPage.tsx`, xem
  `frontend/docs/CAU_TRUC_ROUTE.md`).
