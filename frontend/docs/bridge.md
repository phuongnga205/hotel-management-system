# Cấu trúc dữ liệu Backend — hướng dẫn cho Frontend

> Tổng hợp từ `backend/db.md`, migration
> `backend/src/migrations/1787060046910-CreateInitialSchema.ts`, các entity
> (`*.entity.ts`), enum (`*.enum.ts`) và DTO (`*.dto.ts`) trong
> `backend/src`. Mục tiêu: FE biết chính xác **kiểu dữ liệu, field bắt buộc/
> optional, và tập giá trị hợp lệ** của từng field để map đúng khi build
> form, table, filter... Xem thêm quy ước API chung (response envelope,
> lỗi, phân trang) ở `backend/docs/DANH_SACH_API.md`.

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
- **Số tiền / giá (`pricePerNight`, `totalPrice`, `amount`)**: cột DB là
  `DECIMAL(10,2)`. Entity có transformer chuyển về kiểu `number` JS khi đọc
  (`Room`, `Booking`), nhưng `Payment.amount` hiện **không** có transformer
  nên trả về **string** (ví dụ `"150.00"`) — FE cần `Number(...)` trước khi
  tính toán/format tiền cho riêng field này. Luôn tối đa 2 chữ số thập phân.
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
required), `phone` (optional, string). `UpdateUserDto` = tất cả field trên
nhưng optional (partial).

**Đổi mật khẩu** (`ChangePasswordDto`): `currentPassword` (string,
required), `newPassword` (string, tối thiểu 6 ký tự).


## 2. `auth_tokens` — nội bộ, FE không gọi trực tiếp

Không có endpoint trả entity này thẳng ra FE. Luồng liên quan:
- Kích hoạt tài khoản: FE gửi `email` + `otp` (`ActivateAccountDto`) —
  `otp` là chuỗi số (`IsNumberString`) **đúng 6 ký tự**.
- Quên mật khẩu: FE gửi `email` (`ForgotPasswordDto`).
- Đặt lại mật khẩu: FE gửi `email` + `otp` (6 ký tự số) + `newPassword`
  (tối thiểu 6 ký tự) (`ResetPasswordDto`).

`type` nội bộ chỉ nhận `'EMAIL_VERIFICATION' | 'PASSWORD_RESET'` — không
liên quan trực tiếp tới FE vì không trả ra API.

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
| `roomType` | `string \| null` | optional | tối đa 50 ký tự, **free text**, không phải enum (chưa có danh sách cố định trong code hiện tại) |
| `description` | `string \| null` | optional | `text`, không giới hạn độ dài rõ ràng ở DB |
| `viewType` | `'CITY_VIEW' \| 'GARDEN_VIEW' \| 'SEA_VIEW' \| null` | optional | enum cố định — dùng đúng 3 giá trị này cho dropdown filter/form |
| `capacity` | `number` (int, dương) | ✔ | `IsInt`, `IsPositive` — số nguyên > 0 |
| `pricePerNight` | `number` | ✔ | `DECIMAL(10,2)`, `Min(0)`, tối đa 2 chữ số thập phân |
| `status` | `'ACTIVE' \| 'INACTIVE' \| 'MAINTENANCE'` | optional (mặc định `ACTIVE`) | trạng thái vận hành, **không** phản ánh còn trống ngày cụ thể hay không (xem `GET /rooms/available` trong `DANH_SACH_API.md`) |
| `createdAt` / `updatedAt` | `string` | — | |
| `deletedAt` | `string \| null` | — | |

`ListRoomsDto` (query phân trang danh sách phòng): `skip` (int ≥ 0, mặc
định 0), `take` (int, 1–100, mặc định 50). *(Lưu ý: khác với quy ước
`page`/`limit` nêu trong `DANH_SACH_API.md` — đây là điểm chưa thống nhất
giữa 2 tài liệu, FE nên xác nhận lại với BE endpoint `GET /rooms` dùng
`skip`/`take` hay `page`/`limit` trước khi code.)*

## 4. `images` (ảnh phòng)

| Field | Kiểu FE | Bắt buộc | Ghi chú |
|---|---|---|---|
| `id` | `string` | — | |
| `roomId` | `string` | ✔ | numeric string (`IsNumberString`) |
| `imageUrl` | `string` | ✔ | tối đa 500 ký tự |
| `isThumbnail` | `boolean` | optional (mặc định `false`) | tối đa **1 ảnh thumbnail active** mỗi phòng (constraint DB), BE tự đảm bảo, FE không cần tự validate nhưng nên disable UI cho phép chọn nhiều thumbnail cùng lúc |
| `createdAt` / `updatedAt` | `string` | — | |
| `deletedAt` | `string \| null` | — | |

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

## 6. `bookings`

| Field | Kiểu FE | Bắt buộc (tạo) | Ghi chú / giá trị hợp lệ |
|---|---|---|---|
| `id` | `string` | — | |
| `userId` | `string` | — | lấy từ JWT, FE không tự gửi |
| `roomId` | `string` | ✔ | numeric string |
| `checkInDate` | `string` (`YYYY-MM-DD`) | ✔ | `IsDateString` |
| `checkOutDate` | `string` (`YYYY-MM-DD`) | ✔ | phải **sau** `checkInDate` (`chk_bookings_dates`) |
| `pricePerNight` | `number` | — | snapshot giá phòng tại thời điểm đặt, BE tự set, FE không gửi |
| `totalPrice` | `number` | — | BE tự tính, FE không gửi |
| `status` | `'PENDING' \| 'ACCEPTED' \| 'REJECTED' \| 'CANCELLED' \| 'EXPIRED'` | — | mặc định `PENDING`; BE quản lý transition, FE chỉ hiển thị + gọi action tương ứng (`/cancel`, admin `/accept`, `/reject`) |
| `holdExpiresAt` | `string \| null` (ISO datetime) | — | hạn giữ chỗ cho booking `PENDING` chưa thanh toán; `null` khi đã thanh toán/xử lý xong |
| `note` | `string \| null` | optional | tối đa 1000 ký tự |
| `cancelReason` | `string \| null` | — | do user điền khi huỷ (`CancelBookingDto.reason`, tối đa 500 ký tự) hoặc admin điền khi từ chối |
| `createdAt` / `updatedAt` | `string` | — | |
| `deletedAt` | `string \| null` | — | |

**Quan trọng — race condition khi đặt/sửa phòng**: `POST /bookings` và
`PATCH /bookings/:id` có thể trả **`409 Conflict`** nếu phòng đã bị đặt
trùng ngày (constraint `excl_bookings_no_overlap`, chỉ tính booking đang
`PENDING`/`ACCEPTED`). FE phải bắt riêng `statusCode === 409` ở 2 endpoint
này để hiển thị UI "chọn phòng/ngày khác" (không phải toast lỗi chung).

## 7. `payments`

| Field | Kiểu FE | Ghi chú / giá trị hợp lệ |
|---|---|---|
| `id` | `string` | |
| `bookingId` | `string` | |
| `amount` | **`string`** (không phải `number`!) | `DECIMAL(10,2)`, entity **không có transformer** nên trả nguyên chuỗi kiểu `"150.00"` — FE tự `Number(amount)` khi cần tính toán/hiển thị, ≥ 0 |
| `method` | `'CASH' \| 'BANK_TRANSFER' \| 'CREDIT_CARD' \| 'VNPAY'` | enum cố định |
| `status` | `'PENDING' \| 'SUCCESS' \| 'FAILED' \| 'REFUNDED'` | mặc định `PENDING` |
| `transactionId` | `string \| null` | tối đa 100 ký tự, unique khi không null |
| `paidAt` | `string \| null` (ISO datetime) | |
| `createdAt` / `updatedAt` | `string` | |
| `deletedAt` | `string \| null` | |

> Endpoint `POST /bookings/:id/pay` hiện là **stub** (chưa implement thật),
> theo `DANH_SACH_API.md` — FE không nên hard-code luồng thanh toán chi
> tiết cho tới khi BE chốt.

## 8. `reviews`

| Field | Kiểu FE | Bắt buộc (tạo) | Ghi chú |
|---|---|---|---|
| `id` | `string` | — | |
| `bookingId` | `string` | ✔ | numeric string; **1 booking chỉ được review 1 lần** (unique) |
| `roomId` | `string` | — | BE tự suy ra từ booking, FE không gửi |
| `userId` | `string` | — | BE tự lấy từ JWT, FE không gửi |
| `rating` | `number` (int) | ✔ | `1`–`5` (`Min(1)`, `Max(5)`) |
| `comment` | `string \| null` | optional | tối đa 2000 ký tự |
| `deleteReason` | `string \| null` | — | chỉ có giá trị khi admin xoá review (`DELETE /admin/reviews/:id`), lý do **cố định theo template email**, không phải do admin nhập tuỳ ý |
| `createdAt` | `string` | — | |
| `deletedAt` | `string \| null` | — | review **không được sửa**, chỉ tạo hoặc xoá (không có field `updatedAt`) |

## 9. `email_logs` (chỉ Admin xem, qua `GET /admin/email-logs*`)

| Field | Kiểu FE | Ghi chú / giá trị hợp lệ |
|---|---|---|
| `id` | `string` | |
| `type` | `string` | về mặt DB là `varchar(50)` tự do, nhưng giá trị thực tế luôn là 1 trong `EmailType`: `'account-activation' \| 'password-reset' \| 'password-changed' \| 'booking-status-changed' \| 'review-deleted'` (lưu ý: kebab-case, khác style `UPPER_SNAKE_CASE` của các status khác) |
| `recipient` | `string` | email người nhận, tối đa 255 ký tự |
| `status` | `'PENDING' \| 'SENT' \| 'FAILED'` | dùng để lọc danh sách (`GET /admin/email-logs?status=`) |
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
type EmailStatus = 'PENDING' | 'SENT' | 'FAILED';
type EmailType =
  | 'account-activation'
  | 'password-reset'
  | 'password-changed'
  | 'booking-status-changed'
  | 'review-deleted';
```

---

## Nguồn tham chiếu (khi cần đối chiếu lại)

- `backend/db.md` — schema SQL mô tả ý định thiết kế ban đầu (có vài điểm
  đã lệch so với migration thật, xem ghi chú ở mục 1 — luôn ưu tiên
  migration/entity khi có mâu thuẫn).
- `backend/src/migrations/1787060046910-CreateInitialSchema.ts` — schema
  SQL **thực tế** đang chạy.
- `backend/src/**/entities/*.entity.ts` — mapping TypeORM, kiểu dữ liệu
  runtime (đặc biệt các transformer số/tiền).
- `backend/src/**/dto/*.dto.ts` — validation rule chính xác cho request
  body (độ dài, optional/required, format).
- `backend/src/**/enums/*.enum.ts` — nguồn gốc mọi giá trị enum liệt kê ở
  trên.
- `backend/docs/DANH_SACH_API.md` — danh sách endpoint, response envelope,
  quy ước lỗi/phân trang, các case đặc biệt (409 race condition, event nội
  bộ gửi mail...).
