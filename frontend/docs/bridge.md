# Cấu trúc dữ liệu Backend — hướng dẫn cho Frontend

> Tổng hợp từ `backend/db.md`, migration
> `backend/src/migrations/1787060046910-CreateInitialSchema.ts`, các entity
> (`*.entity.ts`), enum (`*.enum.ts`) và DTO (`*.dto.ts`) trong
> `backend/src`. Mục tiêu: FE biết chính xác **kiểu dữ liệu, field bắt buộc/
> optional, và tập giá trị hợp lệ** của từng field để map đúng khi build
> form, table, filter... Xem thêm quy ước API chung (response envelope,
> lỗi, phân trang) ở `backend/docs/DANH_SACH_API.md`.
>
> **Rooms/Images/Amenities (mục 3, 4, 5) mô tả theo thiết kế đã CHỐT** (xem
> cảnh báo đầu `backend/docs/DANH_SACH_API.md`) — đang nằm ở 1 nhánh git
> riêng chưa merge. Code FE mới thì theo tài liệu này.

## Quy ước chung cần nhớ khi map dữ liệu

- **ID là chuỗi số, không phải `number`.** Mọi khoá chính đều là `BIGSERIAL`
  (Postgres `bigint`). TypeORM/`class-transformer` serialize `bigint` ra
  JSON dưới dạng **string** (`"id": "12"`, không phải `12`) để tránh mất độ
  chính xác khi số vượt quá `Number.MAX_SAFE_INTEGER`. FE **không** parse
  `id`/`*Id` thành `number` để so sánh hay hiển thị — giữ nguyên string
  (so sánh bằng `===` giữa 2 string là đủ), chỉ format nếu cần hiển thị.
- **Tất cả timestamp là ISO 8601 có timezone** (Postgres `timestamptz`),
  ví dụ `"2026-08-19T10:30:00.000Z"`. Field ngày thuần (`checkInDate`,
  `checkOutDate`) là kiểu `date`, dạng chuỗi `"YYYY-MM-DD"`, không có giờ.
- **Số tiền / giá (`pricePerNight`, `totalPrice`, `amount`) — LUÔN LÀ
  `string` trong response, không phải `number`.** Cột DB là `DECIMAL(10,2)`.
  Entity dùng `decimalTransformer`
  (`backend/src/common/transformers/decimal.transformer.ts`) nên khi đọc từ
  DB, `Room.pricePerNight`/`Booking.pricePerNight`/`Booking.totalPrice` là
  instance **`Decimal` (decimal.js)** ở tầng entity — nhưng cả
  `RoomResponseDto` lẫn `BookingResponseDto` đều gọi tường minh
  `.toString()` (xem comment trong `room-response.dto.ts`: bắt buộc phải ép
  vậy, không thì `class-transformer` cố `new Decimal()` lại và throw) trước
  khi trả ra JSON — nên **API thực tế trả về string** (`"150.00"`), giống
  hệt `Payment.amount` (field này chưa từng có transformer, luôn là string
  ngay từ đầu). **Cả 3 field — `pricePerNight`, `totalPrice`, `amount` —
  đều cùng 1 quy tắc: FE phải `Number(...)` trước khi tính toán/format tiền
  (`.toLocaleString()` gọi thẳng trên string sẽ không lỗi nhưng cũng không
  thêm dấu phân cách nghìn — chỉ trả lại nguyên chuỗi).** Luôn tối đa 2 chữ
  số thập phân.
  > ✅ **Đã sửa (từng lệch với `frontend/src/api/types.ts`, nay đã khớp).**
  > `Room.pricePerNight`, `Booking.pricePerNight`, `Booking.totalPrice`
  > từng khai `number` trong `types.ts` (chỉ `Payment.amount` khai đúng
  > `string` từ đầu) — đã đổi cả 3 sang `string`, và mọi chỗ hiển thị
  > (`BookingCard.tsx`, `PriceSummaryCard.tsx`, `RoomCard.tsx`,
  > `AdminBookingListPage.tsx`, `AdminBookingDetailPage.tsx`,
  > `AdminDashboardPage.tsx`, `AdminUserDetailPage.tsx`,
  > `AdminRoomListPage.tsx`, `AdminRoomDetailPage.tsx`) đã bọc
  > `Number(...)` trước khi `.toLocaleString()`/tính toán. Mock
  > (`room.mock.ts`, `booking.mock.ts`) cũng đã đổi fixture sang string
  > (`"320.00"`) khớp đúng shape API thật.
- **Trường trạng thái (status-like) là `varchar` + CHECK constraint**,
  không phải Postgres enum — nhưng giá trị luôn nằm trong tập cố định liệt
  kê bên dưới cho từng bảng. FE nên định nghĩa các union type/enum tương ứng
  phía TypeScript để so khớp, tránh gõ tay chuỗi rải rác.
- **Soft delete**: các bảng có `deletedAt` (users, rooms, images, amenities,
  bookings, payments, reviews) dùng xoá mềm — record bị xoá vẫn còn trong
  DB nhưng bị lọc khỏi kết quả trả về mặc định. FE không cần tự lọc, nhưng
  cần hiểu `deletedAt: null` = còn hoạt động, khác `null` = đã xoá.
- **Response envelope**: mọi API thành công trả
  `{ statusCode, message, data }`; danh sách có phân trang trả
  `data: { items, total, page, limit, totalPages }`. Lỗi trả
  `{ statusCode, message, error }`, FE phân biệt lỗi bằng `statusCode`,
  **không** so khớp `message` (message đổi theo `x-lang`, xem
  `backend/docs/DANH_SACH_API.md`).

---

## 1. `users`

| Field | Kiểu FE | Bắt buộc | Ghi chú / giá trị hợp lệ |
|---|---|---|---|
| `id` | `string` | — | bigint dạng string |
| `username` | `string` | ✔ khi tạo | unique, tối đa 50 ký tự |
| `email` | `string` | ✔ khi tạo | unique, phải là email hợp lệ (`IsEmail`) |
| `password` | *(không bao giờ trả về)* | — | có `@Exclude()`, FE không bao giờ nhận field này trong response |
| `fullName` | — | — | — |
| `phone` | `string \| null` | optional | tối đa 20 ký tự, unique |
| `avatarUrl` | `string \| null` | optional | tối đa 500 ký tự |
| `role` | `'USER' \| 'ADMIN'` | — | mặc định `'USER'` |
| `status` | `'ACTIVE' \| 'INACTIVE'` | — | mặc định `'INACTIVE'` (chưa kích hoạt qua email) |
| `createdAt` / `updatedAt` | `string` (ISO datetime) | — | |
| `deletedAt` | `string \| null` | — | soft delete |

**DTO đăng ký/tạo user** (`RegisterDto` / `CreateUserDto`): `email` (email
hợp lệ), `password` (string, **tối thiểu 6 ký tự**), `username` (string,
required), `phone` (optional, string). `UpdateUserDto` (`PATCH /users/me`) =
`email`/`username`/`fullName`/`phone`, tất cả optional (partial) — **không**
có `role`/`status`, self-service không tự đổi được 2 field này.

> 🆕 **Admin — `AdminUpdateUserDto`** (`PATCH /admin/users/:id`, optional,
> chưa có UI FE — xem `backend/docs/DANH_SACH_API.md` mục 8): giống
> `UpdateUserDto` nhưng có thêm `role` (`'USER' | 'ADMIN'`) và `status`
> (`'ACTIVE' | 'INACTIVE'`), tất cả field optional. Admin cũng có
> `POST /admin/users` (dùng `CreateUserDto`, tài khoản tạo ra kích hoạt
> ngay — `status='ACTIVE'`, không qua OTP) và `DELETE /admin/users/:id`
> (xoá mềm).

**Đổi mật khẩu** (`ChangePasswordDto`): `currentPassword` (string,
required), `newPassword` (string, tối thiểu 6 ký tự).

> ✅ **Avatar — `POST`/`DELETE /users/me/avatar` đã implement (Cloudinary)
> và FE đã dựng UI.** Upload: `multipart/form-data`, field `file`
> (jpg/jpeg/png/webp, tối đa 5MB — `AvatarFileValidationPipe`, 400 nếu sai
> định dạng/quá size), response `{statusCode, message, data: UserProfile}`
> (envelope đầy đủ, avatar mới nằm ở `data.avatarUrl`). Xoá: không nhận
> body, response chỉ `{statusCode, message}` (không có `data`), 404 nếu
> chưa từng có avatar. 1 slot ảnh/user, `public_id` cố định theo userId +
> `overwrite: true` (giống ảnh phòng, xem mục 4) — không cần lưu/tra
> `public_id` cũ. FE: `userApi.uploadAvatar(file)`/`removeAvatar()`
> (`frontend/src/api/user.api.ts`), validate type/size client-side trước
> qua `constants/avatar.ts` (PHẢI khớp giới hạn BE ở
> `backend/src/config/avatar-upload.config.ts`) chỉ để phản hồi nhanh hơn —
> BE vẫn tự validate lại lần cuối. Cả 2 action gọi `refreshUser()`
> (`hooks/useAuth.ts`) sau khi xong để avatar trên `Header.tsx` cập nhật
> ngay, không cần F5.

> ✅ **`role` giờ là nguồn phân quyền UI thật ở FE**, không chỉ để
> `AdminGuard` chặn route sau khi điều hướng — `contexts/AuthProvider.tsx`
> gọi `userApi.getProfile()` 1 lần lúc app mount (và lại sau khi login),
> lưu vào `AuthContext`; `Header.tsx` đọc `isAdmin` qua `hooks/useAuth.ts`
> để quyết định hiện nav/dropdown nào (xem
> `frontend/docs/CAU_TRUC_ROUTE.md` mục "Auth/role state"). Hoạt động giống
> nhau dù `VITE_USE_MOCK` là gì vì `userApi.getProfile()` đã có cặp
> real+mock từ trước.


## 2. OTP xác thực trong Redis — nội bộ, FE không gọi trực tiếp

Không có endpoint trả entity này thẳng ra FE. Luồng liên quan:
- Kích hoạt tài khoản: FE gửi `email` + `otp` (`ActivateAccountDto`) —
  `otp` là chuỗi số (`IsNumberString`) **đúng 6 ký tự**.
- Quên mật khẩu: FE gửi `email` (`ForgotPasswordDto`).
- Đặt lại mật khẩu: FE gửi `email` + `otp` (6 ký tự số) + `newPassword`
  (tối thiểu 6 ký tự) (`ResetPasswordDto`).

`type` nội bộ chỉ nhận `'EMAIL_VERIFICATION' | 'PASSWORD_RESET'` — không
liên quan trực tiếp tới FE vì không trả ra API.

Ba endpoint đã được BE implement và trả envelope
`{ statusCode: 200, message, data: null }`. OTP được lưu ở Redis với key
`otp:<purpose>:<userId>`, TTL lấy từ `OTP_TTL_SECONDS` (mặc định 600 giây),
không tạo lại bảng `auth_tokens` trong PostgreSQL.

> **Đã chốt (thay cho model link/token trước đây)**: kích hoạt tài khoản và
> đặt lại mật khẩu dùng **OTP 6 số nhập tay**, không dùng link kèm token
> trong email — email chỉ hiển thị mã để user tự gõ. Route FE tương ứng
> (`/activate`, `/reset-password`) chỉ nhận `?email=` để prefill, không có
> `?token=`. Xem `backend/docs/DANH_SACH_API.md` mục Auth và
> `frontend/docs/CAU_TRUC_ROUTE.md`.

## 3. `rooms`

| Field | Kiểu FE | Bắt buộc (tạo) | Ghi chú / giá trị hợp lệ |
|---|---|---|---|
| `id` | `string` | — | |
| `roomNumber` | `string` | ✔ | unique, tối đa 20 ký tự |
| `name` | `string` | ✔ | tối đa 150 ký tự |
| `roomType` | `string` | ✔ | tối đa 50 ký tự, **free text**, không phải enum — DB column nullable nhưng `CreateRoomDto` bắt buộc không rỗng khi tạo phòng, đừng coi đây là 1 tập giá trị cố định (không dựng dropdown chọn sẵn kiểu SINGLE/DOUBLE/... — không tồn tại ở backend) |
| `description` | `string \| null` | optional | `text`, không giới hạn độ dài rõ ràng ở DB |
| `viewType` | `'CITY_VIEW' \| 'GARDEN_VIEW' \| 'SEA_VIEW' \| null` | optional | enum cố định — dùng đúng 3 giá trị này cho dropdown filter/form |
| `capacity` | `number` (int, dương) | ✔ | `IsInt`, `IsPositive` — số nguyên > 0. 🆕 Giờ được dùng thật để lọc phòng theo query `guests` ở `GET /rooms`/`GET /rooms/available` (xem ngay dưới) — trước đây field này có sẵn nhưng chưa lọc ở đâu cả. |
| `pricePerNight` | **`string`** trong response (`number` khi gửi lên qua `CreateRoomDto`/`UpdateRoomPriceDto`) | ✔ | `DECIMAL(10,2)`, `Min(0)`, tối đa 2 chữ số thập phân — xem cảnh báo ở "Quy ước chung" phía trên |
| `status` | `'ACTIVE' \| 'INACTIVE' \| 'MAINTENANCE'` | optional (mặc định `ACTIVE`) | trạng thái vận hành, **không** phản ánh còn trống ngày cụ thể hay không (xem `GET /rooms/available` trong `DANH_SACH_API.md`) |
| `amenities` | `{ id: string; name: string }[] \| undefined` | — | chỉ có khi API load quan hệ (list/detail đều có) — `undefined` = chưa load, `[]` = load rồi nhưng phòng chưa gán tiện nghi nào, phân biệt rõ 2 trường hợp |
| `images` | `{ id: string; imageUrl: string; isThumbnail: boolean }[] \| undefined` | — | tương tự `amenities` — FE nên chỉ quan tâm ảnh có `isThumbnail === true` nếu theo khuyến nghị 1-ảnh/phòng (xem mục 4) |
| `createdAt` / `updatedAt` | `string` | — | |
| `deletedAt` | `string \| null` | — | |

`ListRoomsDto` (query phân trang danh sách phòng, `GET /admin/rooms`):
`page` (int ≥ 1, mặc định 1), `limit` (int, 1–100, mặc định 10) — **đúng
quy ước chung `page`/`limit`** nêu trong `DANH_SACH_API.md`, không phải
`skip`/`take` (bản trước của tài liệu này ghi nhầm `skip`/`take`, đã sửa).
`ListPublicRoomsDto` (`GET /rooms`) cùng `page`/`limit` nhưng **không có**
field `status` — public không tự chọn được xem phòng trạng thái gì, server
luôn tự lọc `status = ACTIVE`. 🆕 Có thêm `guests?: number` (optional) —
lọc `capacity >= guests`, khớp FE `ListRoomsQuery.guests` (`api/types.ts`).

🆕 **`FindAvailableRoomsDto` (`GET /rooms/available`)** — trước đây tài
liệu này gộp chung với `ListPublicRoomsDto` nhưng thực ra **shape khác
hẳn**: `checkIn`/`checkOut` (bắt buộc, `YYYY-MM-DD`), `minPrice`/`maxPrice`
(optional), `amenities` (optional, mảng tên tiện nghi), `guests` (optional,
lọc `capacity >= guests`), cộng `page`/`limit`. Khớp FE type
`ListAvailableRoomsQuery` (`api/types.ts`) — **type này trước đây chưa tồn
tại**, không có shape nào khớp `GET /rooms/available` ở FE. Gọi qua
`roomApi.listAvailable(query)` (`api/room.api.ts`) — endpoint constant
`API_ENDPOINTS.ROOMS_AVAILABLE` đã có sẵn từ trước nhưng **chưa từng có
method nào gọi tới**, giờ đã nối xong.

## 4. `images` (ảnh phòng)

| Field | Kiểu FE | Bắt buộc | Ghi chú |
|---|---|---|---|
| `id` | `string` | — | |
| `roomId` | `string` | ✔ | numeric string (`IsNumberString`) |
| `imageUrl` | `string` | ✔ | URL tuyệt đối trên Cloudinary CDN (không phải path local) |
| `isThumbnail` | `boolean` | optional (mặc định `false`) | tối đa **1 ảnh thumbnail active** mỗi phòng (constraint DB), BE tự đảm bảo, FE không cần tự validate nhưng nên disable UI cho phép chọn nhiều thumbnail cùng lúc |
| `createdAt` / `updatedAt` | `string` | — | |
| `deletedAt` | `string \| null` | — | |

`imagePublicId` (Cloudinary `public_id`) tồn tại ở entity/DB nhưng
**không** trả ra `RoomImageResponseDto` — chỉ backend dùng để biết xoá đúng
asset Cloudinary nào, FE không cần và không nên gửi field này lên.

**Khuyến nghị FE: 1 ảnh/phòng.** Backend cho phép N ảnh/phòng (`POST
/admin/rooms/:id/images` gọi được nhiều lần) và có sẵn endpoint
`PATCH /admin/rooms/:roomId/images/:id/thumbnail` để đổi ảnh đại diện giữa
nhiều ảnh có sẵn — nhưng để màn hình quản trị đơn giản (không cần
gallery/kéo-thả sắp xếp), **FE nên chỉ quản lý đúng 1 ảnh/phòng**, giống
UX ảnh đại diện user:
- Upload ảnh đầu tiên: `POST /admin/rooms/:id/images` với `isThumbnail: true`.
- Đổi ảnh: xoá ảnh cũ (`DELETE /admin/rooms/:id/images/:imageId`) rồi upload
  ảnh mới (2 lời gọi API, không dùng `.../thumbnail` trong luồng 1-ảnh này).
- Hiển thị: chỉ hiện ảnh có `isThumbnail === true` trong mảng `room.images`
  (hoặc phần tử đầu tiên nếu mảng chỉ có 1 ảnh).

## 5. `amenities` & `room_amenities`

**Amenity**

| Field | Kiểu FE | Bắt buộc | Ghi chú |
|---|---|---|---|
| `id` | `string` | — | |
| `name` | `string` | ✔ | unique, tối đa 100 ký tự |
| `description` | `string \| null` | optional | tối đa 255 ký tự |
| `createdAt`/`updatedAt`/`deletedAt` | `string \| null` | — | |

**RoomAmenity** (bảng nối, không soft-delete): `roomId` + `amenityId` đều
là numeric string bắt buộc — đây là composite primary key, không có `id`
riêng.

> `GET /amenities`, `GET /amenities/:id` **công khai** (không cần đăng
> nhập) — chỉ `POST`/`PATCH`/`DELETE /amenities` cần JWT + role ADMIN, xem
> `backend/docs/DANH_SACH_API.md` mục 6b. Amenity **không** gắn `roomId` —
> đây là 1 catalog dùng chung cho mọi phòng, gán vào từng phòng qua bảng nối
> `RoomAmenity` (`POST /admin/rooms/:id/amenities`).

## 6. `bookings`

> **Response thật (`data`/`data.items[]`) KHÔNG có field phẳng `userId`/
> `roomId`/`holdExpiresAt`/`updatedAt`/`deletedAt`** — đây là field của
> entity/DB, khác với shape trả về qua API. Bảng dưới đây mô tả đúng
> `Booking` type ở `frontend/src/api/types.ts` (khớp `BookingResponseDto`
> phía BE) — trộn field request (tạo/sửa) và field response cho gọn nhưng
> ghi rõ field nào chỉ ở request.

| Field | Kiểu FE | Ghi chú / giá trị hợp lệ |
|---|---|---|
| `id` | `string` | |
| `roomId` (chỉ **request** tạo) | `string` | numeric string, `CreateBookingDto.roomId` |
| `checkInDate` | `string` (`YYYY-MM-DD`) | `IsDateString`, bắt buộc khi tạo |
| `checkOutDate` | `string` (`YYYY-MM-DD`) | phải **sau** `checkInDate` (`chk_bookings_dates`), bắt buộc khi tạo |
| `guests` | `number` (int, dương) | 🆕 **Bắt buộc khi tạo** (`CreateBookingPayload.guests`), BE validate `guests <= room.capacity` (400 `GUESTS_EXCEED_CAPACITY` nếu vượt). **KHÔNG có trong `UpdateBookingPayload`** — cố định sau khi tạo, `PATCH /bookings/:id` chỉ sửa được `checkInDate`/`checkOutDate`/`note`, không sửa được số khách (muốn đổi phải huỷ đặt lại). |
| `pricePerNight` | **`string`** (không phải `number`) | snapshot giá phòng tại thời điểm đặt, BE tự set, FE không gửi — xem cảnh báo ở "Quy ước chung" |
| `totalPrice` | **`string`** (không phải `number`) | 🆕 **BE tự tính = `nights × pricePerNight × guests`** (trước đây chỉ `nights × pricePerNight`, không phụ thuộc số khách) — FE không gửi, cũng là `amount` mà `POST .../pay` sẽ tự lấy, FE không gửi `amount` |
| `status` | `'PENDING' \| 'ACCEPTED' \| 'REJECTED' \| 'CANCELLED' \| 'EXPIRED'` | mặc định `PENDING`; BE quản lý transition, FE chỉ hiển thị + gọi action tương ứng (`/cancel`, `/pay`, admin `/accept`, `/reject`) |
| `note` | `string \| null` | optional khi tạo/sửa, tối đa 1000 ký tự |
| `cancelReason` | `string \| null` | do user điền khi huỷ (`CancelBookingDto.cancelReason`, tối đa 500 ký tự, optional) hoặc admin điền khi từ chối (`RejectBookingDto.cancelReason`, **cùng tên field**, cùng cột DB `bookings.cancel_reason`) |
| `createdAt` | `string` | |
| `room` | `BookingRoomSummary \| undefined` | `{id, name, roomNumber, thumbnailUrl?}` — chỉ có khi BE load kèm relation (luôn có ở mọi response hiện tại); `thumbnailUrl` lấy từ ảnh `isThumbnail=true` của phòng, `null` nếu phòng chưa có ảnh đại diện |
| `user` | `BookingUserSummary \| undefined` | `{id, fullName, email, phone}` — **chỉ có ở response Admin** (`GET /admin/bookings*`), không có ở response self-service của khách (khách tự biết mình là ai) |
| `payment` | `Payment \| undefined` | payment **mới nhất** của booking (1 booking có thể có nhiều lần thử thanh toán qua vòng đời, BE tự lấy bản mới nhất theo `createdAt`) — `undefined` nghĩa là chưa từng thanh toán lần nào, xem mục `payments` bên dưới và component `PaymentBadge` |

**Hold 10 phút + race condition khi đặt/sửa phòng**: `POST /bookings` set
hạn giữ chỗ 10 phút (không có field FE nào tương ứng để đọc/ghi — hoàn
toàn nội bộ BE). `POST /bookings` và `PATCH /bookings/:id` có thể trả
**`409 Conflict`** nếu phòng đã bị đặt trùng ngày (còn `PENDING` trong hạn
giữ chỗ, hoặc đã `ACCEPTED`). FE phải bắt riêng `statusCode === 409` ở 2
endpoint này để hiển thị UI "chọn phòng/ngày khác" (không phải toast lỗi
chung). `POST /bookings/:id/pay` trả **`409`** tương tự nếu booking không
còn `PENDING` (đã bị accept/reject/cancel/expire trước khi kịp thanh
toán) — nên hiển thị thông báo khác, không gộp chung với lỗi trùng lịch.

**Ownership**: booking không phải của user hiện tại → **`404`**, không
phải `403`, ở mọi route self-service (`GET/PATCH /bookings/:id`,
`.../cancel`, `.../pay`) — quyết định có chủ đích để tránh lộ thông tin
"booking này tồn tại".

> 🆕 **Migration `ExcludeBookingsIgnoreSoftDeleted`** (sau
> `CreateInitialSchema`) sửa 1 bug ở constraint chống trùng lịch cấp DB
> (`excl_bookings_no_overlap`): trước migration này, 1 booking
> `PENDING`/`ACCEPTED` đã bị **xoá mềm** (`deleted_at IS NOT NULL`) vẫn tiếp
> tục chặn người khác đặt trùng phòng/ngày — giờ EXCLUDE constraint đã lọc
> thêm điều kiện `deleted_at IS NULL`. Không ảnh hưởng FE hiện tại (chưa có
> API nào xoá mềm booking — soft-delete chỉ có sẵn ở cột DB, không có
> `DELETE /bookings/:id` nào cả), nhưng cần biết nếu sau này có tính năng
> "xoá booking" thì phòng/ngày đó sẽ nhả ra ngay lập tức đúng như kỳ vọng.

## 7. `payments`

| Field | Kiểu FE | Ghi chú / giá trị hợp lệ |
|---|---|---|
| `id` | `string` | |
| `bookingId` | `string` | |
| `amount` | **`string`** (không phải `number`!) | `DECIMAL(10,2)`, entity **không có transformer** nên trả nguyên chuỗi kiểu `"150.00"` — FE tự `Number(amount)` khi cần tính toán/hiển thị, ≥ 0. **Luôn khớp `booking.totalPrice`** — BE tự tính, `POST .../pay` không nhận `amount` từ FE. |
| `method` | `'CASH' \| 'BANK_TRANSFER' \| 'CREDIT_CARD' \| 'VNPAY'` | enum cố định — request body `POST /bookings/:id/pay` chỉ gồm `{ method }`, đây là field duy nhất FE gửi |
| `status` | `'PENDING' \| 'SUCCESS' \| 'FAILED' \| 'REFUNDED'` | mặc định `PENDING` — nhưng với luồng mock hiện tại, `pay()` luôn trả `SUCCESS` ngay lập tức, **không bao giờ** dừng ở `PENDING`/`FAILED` (2 giá trị này chỉ có ý nghĩa khi nối cổng thanh toán thật sau này, ví dụ chờ webhook). `REFUNDED` chưa có luồng nào tạo ra được (chưa có API hoàn tiền). |
| `transactionId` | `string \| null` | tối đa 100 ký tự, unique khi không null — mock sinh bằng `randomUUID()` |
| `paidAt` | `string \| null` (ISO datetime) | |
| `createdAt` | `string` | |

> **`POST /bookings/:id/pay` đã implement (mock, không phải stub nữa) và
> FE đã dựng UI đầy đủ.** Thanh toán mock luôn thành công ngay lập tức: tạo
> `Payment` (`status: SUCCESS`) + tự động chuyển `booking.status → ACCEPTED`
> trong cùng 1 transaction (case "PENDING + hold còn hạn") — hoặc chỉ tạo
> thêm `Payment SUCCESS` mới, không đổi status (case "ACCEPTED + trả bù").
> FE gọi xong 1 lần là coi như hoàn tất, không cần polling hay chờ callback
> nào. `bookingApi.pay(id, { method })` (`frontend/src/api/booking.api.ts`)
> được gọi từ `BookingPaymentPage.tsx` (`/bookings/:bookingId/payment`).
> `components/bookings/BookingCard.tsx` hiện đúng nút "Pay" cho cả 2 tình
> huống hợp lệ (`canPay = holdActive || (status === 'ACCEPTED' &&
> !hasSuccessPayment)`, xem `backend/docs/DANH_SACH_API.md` mục 4) — kèm
> đồng hồ đếm ngược `HoldCountdown.tsx` khi đang PENDING trong hạn giữ chỗ.
> **`holdExpiresAt` không có trong response** (hoàn toàn nội bộ BE) — FE tự
> suy ra từ `booking.createdAt + BOOKING_HOLD_MINUTES` (hằng số copy sang
> `frontend/src/constants/booking.ts`, PHẢI khớp
> `backend/src/bookings/constants/booking.constants.ts`).

> 🆕 **2 API đọc danh sách payment, tách riêng — `PaymentsModule`
> (`backend/src/payments/`) giờ có Controller/Service thật, không chỉ còn
> mỗi Entity:**
>
> - **`GET /admin/payments`** (Admin, `AdminPaymentsController`) — dùng ở
>   bảng "Transactions" trong màn Statistics > Revenue (FE). Query
>   `page`/`limit`/`status`/`method`. Mỗi item **kèm sẵn thông tin khách +
>   phòng** (`booking: { id, guestName, guestEmail, roomName, roomNumber }`)
>   — join `payment.booking` → `booking.user`/`booking.room` bằng
>   `QueryBuilder`, không cần FE gọi thêm request nào khác. Type FE tương
>   ứng: `AdminPayment` (`frontend/src/api/types.ts`), gọi qua
>   `paymentApi.adminList()` (`frontend/src/api/payment.api.ts`).
> - **`GET /payments/me`** (User, `PaymentsController`) — lịch sử thanh
>   toán của **chính user hiện tại, gộp từ mọi booking** (không scope theo
>   1 booking cụ thể, giống cách `GET /bookings/me` không scope theo
>   phòng). `userId` lấy từ JWT, không nhận từ query. Cùng query
>   `page`/`limit`/`status`/`method`, nhưng response **không** kèm thông
>   tin khách (đã biết là chính mình) — chỉ kèm tóm tắt booking để phân
>   biệt giao dịch nào ứng với booking nào: `booking: { id, roomName,
>   roomNumber, checkInDate, checkOutDate }`.
> - Cả 2 endpoint đều **chỉ đọc danh sách** — không có API xem chi tiết 1
>   giao dịch riêng (`GET /payments/:id`), mỗi item trong list đã đủ thông
>   tin cần thiết. Việc **tạo** `Payment` vẫn nằm nguyên trong
>   `BookingsService.pay()` (không phải `PaymentsService`) vì gắn liền 1
>   transaction với đổi `booking.status`.
> - **BE đã xong cả 2, FE đã dựng UI cho cả Admin lẫn User.** Admin: bảng
>   trong `AdminRevenueStatsPage.tsx` + `PaymentDetailModal.tsx` xem chi
>   tiết 1 dòng. User: `PaymentHistoryPage.tsx` (`/payments`, type FE
>   `UserPayment`/`PaymentBookingSummary`/`ListPaymentsQuery` trong
>   `api/types.ts`), gọi qua `paymentApi.listMine()`. Trang này **không có
>   link riêng trên thanh nav** — truy cập qua mục "Payment History" trong
>   dropdown profile (`Header.tsx`), **chỉ hiện với user thường** (admin
>   không có mục này, xem `frontend/docs/CAU_TRUC_ROUTE.md` mục "Auth/role
>   state"). Mock (`payment.mock.ts`) đọc `listMine()` trực tiếp từ mảng
>   `bookings` (`booking.mock.ts`) thay vì fixture tĩnh riêng như
>   `adminList()`, để phản ánh đúng hành động thật trong phiên (vừa trả
>   tiền 1 booking → thấy ngay ở đây). Chi tiết đầy đủ (mẫu response,
>   Swagger) xem `backend/docs/DANH_SACH_API.md` mục 4a và mục 11.

## 8. `reviews`

| Field | Kiểu FE | Bắt buộc (tạo) | Ghi chú |
|---|---|---|---|
| `id` | `string` | — | |
| `bookingId` | `string` | ✔ | numeric string; **1 booking chỉ được review 1 lần** (unique) |
| `roomId` | `string` | — | BE tự suy ra từ booking, FE không gửi |
| `userId` | `string` | — | BE tự lấy từ JWT, FE không gửi |
| `rating` | `number` (int) | ✔ | `1`–`5` (`Min(1)`, `Max(5)`) |
| `comment` | `string \| null` | optional | tối đa 2000 ký tự |
| `deleteReason` | `string \| null` | — | chỉ có giá trị khi admin xoá review (`DELETE /admin/reviews/:id`), server tự gán `ADMIN_REMOVED` — **BE không nhận `deleteReason` từ body**. Email thông báo dùng body cố định, không hiển thị ID review hoặc lý do xoá. |
| `createdAt` | `string` | — | |
| `deletedAt` | `string \| null` | — | review **không được sửa**, chỉ tạo hoặc xoá (không có field `updatedAt`) |
| `user` | `{ id, fullName, avatarUrl } \| undefined` | — | chỉ có khi API load kèm relation — `GET /rooms/:roomId/reviews`, `GET /reviews/me` và `GET /admin/reviews` đều trả kèm, `POST /reviews` (response tạo mới) thì không |
| `room` | `{ id, name, roomNumber, thumbnailUrl } \| undefined` | — | **chỉ có ở `GET /reviews/me`** — 3 endpoint kia đã biết sẵn phòng nào qua URL/context nên không cần lặp lại field này |

> ✅ **`GET /rooms/:roomId/reviews` đã implement, FE đã dùng** — public,
> **không cần JWT** (kể cả khách chưa đăng nhập). Trả `data.items[]` (mỗi
> item có kèm `user`) + `total`/`page`/`limit`/`totalPages` như mọi list
> khác, đã lọc theo đúng `roomId`. Dùng ở `HomePage.tsx` (carousel đánh giá
> phòng nổi bật) và `RoomDetailPage.tsx` (danh sách đánh giá của phòng) qua
> `reviewApi.listByRoom(roomId, query)` (`frontend/src/api/review.api.ts`).
>
> ✅ **`POST /reviews` đã implement, FE đã dùng** — `BookingReviewPage.tsx`
> (`/bookings/:bookingId/review`), điều kiện được review khớp đúng
> `ReviewsService.create()` ở BE: booking `ACCEPTED` + có payment `SUCCESS`
> + đã qua `checkOutDate`. Nút "Viết đánh giá" trên `BookingCard.tsx`
> (`onReview`) chỉ hiện khi đủ 3 điều kiện này, tránh submit rồi bị `400`.
> Bắt riêng `409` (đã review rồi) qua `getErrorStatusCode()`.
>
> 🆕 **`GET /reviews/me` (self-service, mới thêm ở BE)** — gộp đánh giá của
> chính user hiện tại từ **mọi phòng** (không giới hạn 1 phòng cụ thể,
> khác `GET /rooms/:roomId/reviews`), cùng pattern `*/me` với
> `GET /bookings/me`/`GET /payments/me`. `userId` lấy từ JWT, không nhận từ
> query. Response join kèm `room` (+ `room.images` để suy `thumbnailUrl`)
> nên FE không cần gọi thêm request nào khác. Trước đây định để FE tự ghép
> từ `GET /bookings/me` + gọi `GET /rooms/:roomId/reviews` cho từng phòng
> khác nhau (N+1 request) — đã bỏ hướng đó, làm hẳn 1 API riêng cho gọn.
> FE dùng ở `MyReviewsPage.tsx` (`/reviews`, tab "My Reviews" ngang hàng
> "My Bookings" trên header) qua `reviewApi.listMine()`. Xem
> `backend/docs/DANH_SACH_API.md` mục 5,
> `frontend/docs/DANH_SACH_MAN_HINH.md` mục E2 và
> `frontend/docs/CAU_TRUC_ROUTE.md`.

## 9. `email_logs` (chỉ Admin xem, qua `GET /admin/email-logs*`)

| Field | Kiểu FE | Ghi chú / giá trị hợp lệ |
|---|---|---|
| `id` | `string` | |
| `type` | `string` | một trong `EmailType`: `'account-activation' \| 'password-reset' \| 'booking-status-changed' \| 'review-deleted' \| 'monthly-report'` |
| `recipient` | `string` | email người nhận, tối đa 255 ký tự |
| `status` | `'PENDING' \| 'SENT' \| 'FAILED' \| 'DELIVERED_UNCONFIRMED'` | dùng để lọc danh sách (`GET /admin/email-logs?status=`) |
| `retryCount` | `number` (int ≥ 0) | |
| `lastError` | `string \| null` | |
| `sentAt` | `string \| null` (ISO datetime) | `null` nếu chưa gửi thành công |
| `createdAt` | `string` (ISO datetime) | |

Nút "Gửi lại" (`POST /admin/email-logs/:id/retry`) chỉ nên hiện khi
`status === 'FAILED'`.

---

## Bảng tra nhanh các enum (copy sang FE làm union type / const object)

```ts
// users
type UserRole = 'USER' | 'ADMIN';
type UserStatus = 'ACTIVE' | 'INACTIVE';

// rooms
type RoomStatus = 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE';
type RoomViewType = 'CITY_VIEW' | 'GARDEN_VIEW' | 'SEA_VIEW';

// bookings
type BookingStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'CANCELLED' | 'EXPIRED';

// payments
type PaymentMethod = 'CASH' | 'BANK_TRANSFER' | 'CREDIT_CARD' | 'VNPAY';
type PaymentStatus = 'PENDING' | 'SUCCESS' | 'FAILED' | 'REFUNDED';

// email_logs
type EmailStatus = 'PENDING' | 'SENT' | 'FAILED' | 'DELIVERED_UNCONFIRMED';
type EmailType =
  | 'account-activation'
  | 'password-reset'
  | 'booking-status-changed'
  | 'review-deleted'
  | 'monthly-report';
```

---

## Nguồn tham chiếu (khi cần đối chiếu lại)

- `backend/db.md` — schema SQL mô tả ý định thiết kế ban đầu (có vài điểm
  đã lệch so với migration thật, xem ghi chú ở mục 1 — luôn ưu tiên
  migration/entity khi có mâu thuẫn).
- `backend/src/migrations/1787060046910-CreateInitialSchema.ts` — schema
  SQL gốc. Có thêm các migration sau đó trong cùng thư mục
  (`backend/src/migrations/`) chỉnh sửa/vá lại 1 phần schema gốc — luôn đọc
  **toàn bộ thư mục theo thứ tự timestamp**, không chỉ file đầu tiên, để
  biết đúng schema đang chạy thật. Migration ảnh hưởng trực tiếp tới
  booking/payment tính tới thời điểm viết tài liệu này:
  `ExcludeBookingsIgnoreSoftDeleted` (xem ghi chú ở mục 6).
- `backend/src/**/entities/*.entity.ts` — mapping TypeORM, kiểu dữ liệu
  runtime (đặc biệt các transformer số/tiền).
- `backend/src/**/dto/*.dto.ts` — validation rule chính xác cho request
  body (độ dài, optional/required, format).
- `backend/src/**/enums/*.enum.ts` — nguồn gốc mọi giá trị enum liệt kê ở
  trên.
- `backend/docs/DANH_SACH_API.md` — danh sách endpoint, response envelope,
  quy ước lỗi/phân trang, các case đặc biệt (409 race condition, event nội
  bộ gửi mail...).

> Mục 3/4/5 (rooms/images/amenities) mô tả theo thiết kế đã chốt ở 1 nhánh
> git riêng chưa merge — xem cảnh báo đầu file và đầu
> `backend/docs/DANH_SACH_API.md`.
