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
| Kích hoạt tài khoản (nhập OTP tay) | POST | `/api/v1/auth/activate` | Guest | Không cần (body `{ email, otp }`, `ActivateAccountDto` — `otp` là chuỗi số đúng 6 ký tự, xem `frontend/docs/bridge.md`) |
| Đăng nhập | POST | `/api/v1/auth/login` | Guest | Không cần |
| Đăng xuất | POST | `/api/v1/auth/logout` | User | JWT |
| Quên mật khẩu | POST | `/api/v1/auth/forgot-password` | Guest | Không cần (body `{ email }`, `ForgotPasswordDto` — luôn trả response giống nhau kể cả email không tồn tại, tránh lộ thông tin) |
| Đặt lại mật khẩu | POST | `/api/v1/auth/reset-password` | Guest (xác thực bằng `email` + `otp` trong body) | Không cần (body `{ email, otp, newPassword }`, `ResetPasswordDto`) |

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
> BE implement `/auth/activate`, `/auth/forgot-password`, `/auth/reset-password`
> phải dùng `TokenUtil.saveOtp`/`verifyOtp`/`consumeOtp`
> (`src/token/token.util.ts`), **không** tạo lại entity/table cho việc này.
> 3 endpoint này hiện vẫn chỉ là hợp đồng API đã chốt — code thật (sinh OTP,
> so khớp, emit event gửi mail) chưa implement, xem mục 14.

## 2. Users (self-service)

| Chức năng | Method | URL | Quyền | Auth |
|---|---|---|---|---|
| Xem thông tin cá nhân | GET | `/api/v1/users/me` | User | JWT |
| Chỉnh sửa thông tin cá nhân | PATCH | `/api/v1/users/me` | User | JWT |
| Đổi mật khẩu (đã đăng nhập) | PATCH | `/api/v1/users/me/password` | User | JWT |
| Thêm/thay ảnh đại diện | POST | `/api/v1/users/me/avatar` | User | JWT |
| Xoá ảnh đại diện | DELETE | `/api/v1/users/me/avatar` | User | JWT |

> **Đã implement (Cloudinary)**: file ảnh gửi dạng `multipart/form-data`
> (field `file`, JPG/PNG/WEBP, tối đa `AVATAR_MAX_FILE_SIZE_BYTES`). Lưu
> trên Cloudinary với `public_id` cố định `avatars/user-<userId>` +
> `overwrite: true` — mỗi user chỉ 1 slot ảnh, thay avatar = ghi đè, không
> cần lưu `public_id` riêng trong DB (khác room images bên dưới, xem mục 7).
> `avatarUrl` lưu trong `users.avatar_url` là URL tuyệt đối trên CDN
> Cloudinary, không phải path local.

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

## 4. Bookings (user)

| Chức năng | Method | URL | Quyền | Auth |
|---|---|---|---|---|
| Tạo request đặt phòng | POST | `/api/v1/bookings` | User | JWT |
| Xem chi tiết request đặt phòng của chính mình | GET | `/api/v1/bookings/:id` | User (chỉ chủ booking) | JWT |
| Xem lịch sử các request của tôi | GET | `/api/v1/bookings/me` | User | JWT |
| Chỉnh sửa request đặt phòng (chỉ khi đang `PENDING`) | PATCH | `/api/v1/bookings/:id` | User (chủ booking) | JWT |
| Huỷ request đặt phòng (kèm lý do, chỉ khi đang `PENDING`) | PATCH | `/api/v1/bookings/:id/cancel` | User (chủ booking) | JWT |
| Thanh toán request đặt phòng (chỉ khi đang `PENDING`) | POST | `/api/v1/bookings/:id/pay` | User (chủ booking) | JWT |

> **Booking không thuộc về user hiện tại → `404 Not Found`, không phải
> `403`.** Đây là lựa chọn có chủ đích (tránh lộ thông tin "booking này tồn
> tại nhưng không phải của bạn" cho kẻ dò id) — `GET /bookings/:id`,
> `PATCH /bookings/:id`, `.../cancel`, `.../pay` đều scope theo
> `WHERE id = :id AND user_id = :userId` (`userId` lấy từ JWT qua
> `@GetUser('id')`, không nhận từ body/param) rồi trả `404` nếu không khớp,
> chứ không tách riêng bước check quyền sở hữu để trả `403`. Khác hẳn
> `GET /admin/bookings/:id` (mục 8) — không giới hạn theo chủ sở hữu.

> **Đã implement đầy đủ — kể cả `POST /bookings/:id/pay`** (không còn là
> stub). Body chỉ nhận `{ method }` (`PaymentMethod`), **không có field
> `amount`** — số tiền luôn lấy từ `booking.totalPrice` ở server, không tin
> dữ liệu tiền từ FE. Thanh toán hiện là **mock**: luôn trả `SUCCESS` ngay
> lập tức (không gọi cổng thanh toán thật), nhưng tạo `Payment` thật trong
> DB và tự động chuyển `booking.status` sang `ACCEPTED` — luồng dữ liệu
> (entity, transaction) đã sẵn sàng để nối cổng thanh toán thật sau này chỉ
> bằng cách thay phần "luôn SUCCESS" bằng gọi API cổng thanh toán thực tế.
>
> **Cơ chế giữ chỗ (hold) 10 phút, chống race condition đặt trùng phòng**
> (xem thêm `frontend/docs/bridge.md` mục `bookings`):
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

## 5. Reviews (user)

| Chức năng | Method | URL | Quyền | Auth |
|---|---|---|---|---|
| Tạo đánh giá cho phòng đã đặt | POST | `/api/v1/reviews` | User | JWT |
| Xem đánh giá công khai theo phòng | GET | `/api/v1/rooms/:roomId/reviews` | Guest / User | Không cần |

> **Đã implement**, tách controller trong `ReviewsModule`:
> `ReviewsController` (`POST /reviews`, cần JWT),
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
> **🆕 TODO FE**: endpoint đã sẵn sàng, nhưng chưa có trang nào gọi —
> `RoomDetailPage` (`/rooms/:roomId`) cần thêm phần hiển thị danh sách đánh
> giá của phòng (phân trang), gọi `reviewApi.listByRoom(roomId, query)` (đã
> có sẵn ở `frontend/src/api/review.api.ts`, chỉ chưa được dùng ở page
> nào). Xem `frontend/docs/DANH_SACH_MAN_HINH.md` mục C và
> `frontend/docs/CAU_TRUC_ROUTE.md` mục A.

---

## 6. Admin — Rooms

| Chức năng | Method | URL | Quyền | Auth |
|---|---|---|---|---|
| Xem danh sách phòng (đầy đủ, gồm cả inactive/maintenance) | GET | `/api/v1/admin/rooms` | Admin | JWT + RolesGuard(ADMIN) |
| Xem chi tiết 1 phòng (view quản trị) | GET | `/api/v1/admin/rooms/:id` | Admin | JWT + RolesGuard(ADMIN) |
| Tạo phòng | POST | `/api/v1/admin/rooms` | Admin | JWT + RolesGuard(ADMIN) |
| Chỉnh sửa thông tin phòng | PATCH | `/api/v1/admin/rooms/:id` | Admin | JWT + RolesGuard(ADMIN) |
| Xoá phòng | DELETE | `/api/v1/admin/rooms/:id` | Admin | JWT + RolesGuard(ADMIN) |
| Export danh sách phòng ra Excel | GET | `/api/v1/admin/rooms/export` | Admin | JWT + RolesGuard(ADMIN) |

> **Đã implement.** `GET /admin/rooms` trả **mọi status** (mặc định không
> lọc), có thêm query `status` optional để admin tự thu hẹp theo 1 trạng
> thái. `roomType` là field tự do (`varchar`, không phải bảng danh mục
> riêng) — set/sửa được qua `CreateRoomDto`/`UpdateRoomDto` khi
> tạo/sửa phòng, không có endpoint quản lý danh mục riêng cho nó.

## 7. Admin — Room Images

| Chức năng | Method | URL | Quyền | Auth |
|---|---|---|---|---|
| Upload 1 ảnh cho 1 phòng | POST | `/api/v1/admin/rooms/:id/images` | Admin | JWT + RolesGuard(ADMIN) |
| Xoá 1 ảnh của phòng | DELETE | `/api/v1/admin/rooms/:id/images/:imageId` | Admin | JWT + RolesGuard(ADMIN) |
| Đặt 1 ảnh (đã upload) làm ảnh đại diện phòng | PATCH | `/api/v1/admin/rooms/:id/images/:imageId/thumbnail` | Admin | JWT + RolesGuard(ADMIN) |

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

| Chức năng | Method | URL | Quyền | Auth |
|---|---|---|---|---|
| Xem danh sách toàn bộ booking (mọi user, filter `status`/`search`, phân trang) | GET | `/api/v1/admin/bookings` | Admin | JWT + RolesGuard(ADMIN) |
| Xem chi tiết booking (view quản trị, gồm thông tin user đặt, không giới hạn chủ sở hữu) | GET | `/api/v1/admin/bookings/:id` | Admin | JWT + RolesGuard(ADMIN) |
| Chấp nhận request đặt phòng (chỉ khi đang `PENDING`) | PATCH | `/api/v1/admin/bookings/:id/accept` | Admin | JWT + RolesGuard(ADMIN) |
| Từ chối request đặt phòng (kèm lý do, chỉ khi đang `PENDING`) | PATCH | `/api/v1/admin/bookings/:id/reject` | Admin | JWT + RolesGuard(ADMIN) |

> **Đã implement — `AdminBookingsController`** (`backend/src/bookings/admin-bookings.controller.ts`),
> tách controller riêng khỏi `BookingsController` (self-service của khách)
> nhưng dùng chung 1 `BookingsService`, đúng pattern `RoomsController`/
> `AdminRoomsController` ở mục 6.
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

| Chức năng | Method | URL | Quyền | Auth |
|---|---|---|---|---|
| Tạo người dùng mới | POST | `/api/v1/admin/users` | Admin | JWT + RolesGuard(ADMIN) |
| Xem danh sách người dùng | GET | `/api/v1/admin/users` | Admin | JWT + RolesGuard(ADMIN) |
| Xem chi tiết người dùng | GET | `/api/v1/admin/users/:id` | Admin | JWT + RolesGuard(ADMIN) |
| Chỉnh sửa thông tin người dùng (gồm cả đổi trạng thái/role) | PATCH | `/api/v1/admin/users/:id` | Admin | JWT + RolesGuard(ADMIN) |
| Xoá người dùng | DELETE | `/api/v1/admin/users/:id` | Admin | JWT + RolesGuard(ADMIN) |

> 🆕 **Optional — vượt phạm vi tối thiểu ban đầu của mục này** (bản đầu chỉ
> định nghĩa 3 API: xem danh sách/chi tiết + đổi trạng thái qua
> `PATCH .../status`). `AdminUsersController`
> (`backend/src/users/admin-users.controller.ts`) đã implement đầy đủ CRUD
> thay vì chỉ 3 API đó — đã hoàn thiện, sẵn dùng, không bắt buộc FE phải làm
> UI ngay nếu chưa cần:
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

| Chức năng | Method | URL | Quyền | Auth |
|---|---|---|---|---|
| Xem danh sách đánh giá (toàn hệ thống) | GET | `/api/v1/admin/reviews` | Admin | JWT + RolesGuard(ADMIN) |
| Xoá đánh giá | DELETE | `/api/v1/admin/reviews/:id` | Admin | JWT + RolesGuard(ADMIN) |

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
| Thống kê booking (theo tháng/quý/loại phòng/trạng thái) | GET | `/api/v1/admin/statistics/bookings` | Admin | JWT + RolesGuard(ADMIN) |
| Thống kê doanh thu (theo thời gian/loại phòng) | GET | `/api/v1/admin/statistics/revenue` | Admin | JWT + RolesGuard(ADMIN) |

## 12. Admin — Email Log

| Chức năng | Method | URL | Quyền | Auth |
|---|---|---|---|---|
| Xem lịch sử gửi email (lọc theo PENDING/SENT/FAILED) | GET | `/api/v1/admin/email-logs` | Admin | JWT + RolesGuard(ADMIN) |
| Xem chi tiết 1 email log | GET | `/api/v1/admin/email-logs/:id` | Admin | JWT + RolesGuard(ADMIN) |
| Gửi lại email thất bại | POST | `/api/v1/admin/email-logs/:id/retry` | Admin | JWT + RolesGuard(ADMIN) |

---

## 13. Admin — Amenities

| Chức năng | Method | URL | Quyền | Auth |
|---|---|---|---|---|
| Xem danh sách tiện nghi (catalogue) | GET | `/api/v1/amenities` | Guest / User / Admin | Không cần |
| Xem chi tiết 1 tiện nghi | GET | `/api/v1/amenities/:id` | Guest / User / Admin | Không cần |
| Tạo tiện nghi mới | POST | `/api/v1/amenities` | Admin | JWT + RolesGuard(ADMIN) |
| Chỉnh sửa tiện nghi | PATCH | `/api/v1/amenities/:id` | Admin | JWT + RolesGuard(ADMIN) |
| Xoá tiện nghi (xoá mềm) | DELETE | `/api/v1/amenities/:id` | Admin | JWT + RolesGuard(ADMIN) |

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

| Chức năng | Cơ chế | Trigger | Ghi chú |
|---|---|---|---|
| Gửi email khi booking đổi trạng thái | Event Listener nội bộ (`EventEmitter2`) | Event `BookingStatusChanged` (emit khi accept/reject/sửa booking) | Gửi cho User khi booking chuyển `ACCEPTED` / `REJECTED` / đổi thông tin (ngày, phòng...). Mỗi lần gửi tạo 1 record trong `email-logs`. |
| Gửi email kích hoạt tài khoản | Event Listener nội bộ (`EventEmitter2`) | Event `UserRegistered` (emit khi `POST /auth/register` thành công) | Sinh mã OTP 6 số (không phải link), email chỉ hiển thị mã để user tự gõ vào form ở route `/activate`, xác thực qua `POST /auth/activate`. |
| 🆕 Gửi email đặt lại mật khẩu | Event Listener nội bộ (`EventEmitter2`) | Event `PasswordResetRequested` (emit khi `POST /auth/forgot-password` thành công, kể cả khi email không tồn tại — vẫn trả response giống nhau để tránh lộ thông tin tài khoản nào tồn tại) | Sinh mã OTP 6 số (không phải link), email chỉ hiển thị mã để user tự gõ vào form ở route `/reset-password`, xác thực qua `POST /auth/reset-password`. |
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
- [ ] Emit đủ 5 event gửi mail: `UserRegistered`, `PasswordResetRequested`,
      `BookingStatusChanged`, `ReviewDeleted`, + cron báo cáo doanh thu —
      xem mục 14.
- [ ] Soạn sẵn nội dung template email `ReviewDeleted` (tiêu đề + nội dung
      cố định, không có phần lý do tuỳ chỉnh) — xem mục 14 và mục Admin
      Reviews.
- [x] Đảm bảo `GET /bookings/:id` chặn user xem booking không phải của
      mình, khác với `GET /admin/bookings/:id` không bị chặn theo chủ sở
      hữu — đã implement, **nhưng trả `404` chứ không phải `403`** như dự
      kiến ban đầu ở mục này (quyết định có chủ đích để tránh lộ thông tin
      "booking tồn tại nhưng không phải của bạn", xem ghi chú ở mục 4).
- [x] Endpoint public `GET /rooms/:roomId/reviews` để trang chi tiết phòng
      hiển thị đánh giá — đã implement (`RoomReviewsController`, xem mục 5).
      **FE chưa gọi** — xem TODO ở mục 5 và
      `frontend/docs/DANH_SACH_MAN_HINH.md` mục C.
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
- Trang chi tiết phòng `/rooms/:roomId` (public) — `GET /rooms/:roomId/reviews`
  đã implement (mục 5), không cần thêm route FE mới, chỉ là 1 API được gọi
  thêm trong cùng trang (**TODO**, page chưa gọi — xem
  `frontend/docs/DANH_SACH_MAN_HINH.md` mục C).
