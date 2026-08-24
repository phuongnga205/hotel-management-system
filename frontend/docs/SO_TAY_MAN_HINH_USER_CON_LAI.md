# Sổ tay cho phiên sau — dựng nốt các màn hình User còn thiếu

> File này **không lặp lại** nội dung đã có ở `bridge.md`/`DANH_SACH_API.md`/
> `DANH_SACH_MAN_HINH.md`/`CAU_TRUC_ROUTE.md` — chỉ tổng hợp lại **thứ tự đọc,
> convention bắt buộc, và các bẫy đã từng gặp** trong lúc build các màn admin
> + `BookingHistoryPage` (mùa trước), để phiên sau không phải dò lại từ đầu
> khi dựng nốt các màn User còn thiếu. Đọc file này **trước khi viết dòng
> code đầu tiên**.

## 1. Đọc gì trước, theo đúng thứ tự

1. **`frontend/docs/bridge.md`** — nguồn chân lý duy nhất cho shape dữ liệu
   (field nào bắt buộc, kiểu FE chính xác, field nào là string dù trông như
   number). Đọc mục tương ứng với màn đang làm (mục 3 rooms, mục 6 bookings,
   mục 1 users...) — **không đoán shape từ tên field**.
2. **`backend/docs/DANH_SACH_API.md`** — hợp đồng API đầy đủ: URL, quyền,
   response envelope, các case lỗi đặc biệt (409, 400...). Đối chiếu với
   `bridge.md` nếu thấy lệch (đã có tiền lệ 2 tài liệu lệch nhau, ưu tiên
   đọc code BE thật nếu vẫn nghi ngờ).
3. **`frontend/docs/DANH_SACH_MAN_HINH.md`** — map màn hình ↔ API, cột "Ghi
   chú" của từng dòng đã ghi sẵn caveat cụ thể cho từng trang (dead link nào
   đang tồn tại, API nào cần gọi thêm, field nào mới thêm...). **Đọc đúng
   dòng của trang đang làm trước khi code.**
4. **`frontend/docs/CAU_TRUC_ROUTE.md`** — cấu trúc route, đặc biệt mục
   "Sơ đồ rút gọn" và "Việc cần làm khi implement" ở cuối file.
5. **`frontend/docs/HUONG_DAN_I18N.md`** — quy tắc đặt key i18n.

## 2. Các màn User còn thiếu (theo mức ưu tiên)

| Màn | Route | Ưu tiên | Vì sao |
|---|---|---|---|
| `BookingPaymentPage.tsx` | `/bookings/:bookingId/payment` | 🔴 Cao nhất | Nút "Pay" ở `BookingHistoryPage`/`BookingCard` **đã navigate tới route này** — dead link đang tồn tại thật, người dùng bấm được nhưng không tới đâu. `bookingApi.pay()` đã sẵn sàng gọi thật. |
| `RoomListPage.tsx` | `/rooms` | 🔴 Cao | Luồng nghiệp vụ lõi (tìm phòng), `HomePage.tsx` đã có nhiều link trỏ tới — dead link. |
| `RoomDetailPage.tsx` | `/rooms/:roomId` | 🔴 Cao | Tương tự — dead link từ `HomePage.tsx`. |
| `BookRoomPage.tsx` | `/rooms/:roomId/book` | 🔴 Cao | Tương tự — dead link từ `HomePage.tsx`. Xem mục 3 bên dưới (query carry-forward) trước khi code. |
| `ChangePasswordPage.tsx` | `/profile/change-password` | 🟡 Trung bình | API đã sẵn (`userApi.changePassword()`), chỉ thiếu UI — hiện **không có cách nào** đổi mật khẩu khi đã đăng nhập. |
| Avatar (thêm/thay/xoá) trong `ProfilePage.tsx` | — (không tách route) | 🟡 Trung bình | ⚠️ **Chưa có cả tầng API** — `user.api.ts` chưa có `uploadAvatar()`/`removeAvatar()`, `endpoints.ts` chưa có constant cho `POST`/`DELETE /users/me/avatar`. Phải viết từ API layer, không chỉ thêm UI. |
| `BookingReviewPage.tsx` | `/bookings/:bookingId/review` | 🟢 Thấp hơn | Chưa có cả nút dẫn vào (khác `BookingPaymentPage` — có nút nhưng thiếu đích, ở đây thiếu cả nút). `reviewApi.create()` đã sẵn. |
| `PaymentHistoryPage.tsx` | `/payments` | 🟢 Thấp hơn | ⚠️ **`payment.api.ts` chưa có `listMine()`** cho `GET /payments/me` (chỉ có `adminList()`) — cần viết thêm API layer trước. |

`ForbiddenPage`/`NotFoundPage` **đã xong** (không nằm trong danh sách này nữa).

> 🆕 **Bug khác đã phát hiện, chưa sửa** (không phải thiếu màn, mà là hành vi
> sai): nút "Đăng xuất" (`Header.tsx`, `AdminLayout.tsx`) hiện chỉ
> `clearAccessToken()` phía client, **không gọi `POST /auth/logout`** — JWT
> blacklist ở Redis không bao giờ được kích hoạt. Sửa khi có dịp, không gấp
> nhưng nên biết.

## 3. Convention "mang query xuyên suốt" khi dựng luồng Rooms/Booking

Đã chốt (xem `CAU_TRUC_ROUTE.md` mục B, `DANH_SACH_MAN_HINH.md` mục C):
`checkIn`/`checkOut`/`guests` phải **mang theo qua query string** xuyên suốt
`/rooms → /rooms/:roomId → /rooms/:roomId/book`, **không bắt user điền lại
từ đầu** nếu đã tìm kiếm trước đó.

- **Có query (đến từ search)**: mỗi trang đọc lại `?checkIn=&checkOut=&guests=`
  lúc mount, giữ nguyên khi điều hướng sang trang kế (đừng làm rớt query khi
  gọi `navigate()`), và `BookRoomPage` dùng chúng để **prefill form** (vẫn
  cho sửa lại).
- **Không có query (vào thẳng)**: từ link "phòng nổi bật" ở `HomePage.tsx`
  (hiện navigate trơn, không kèm query — đúng ý, vì đây không phải luồng
  search), bookmark, hay share link — form phải có default hợp lý
  (`guests: 1`, chưa chọn ngày) và để user tự điền.
- Dù case nào, `POST /bookings` **luôn** phải gửi đủ
  `roomId/checkInDate/checkOutDate/guests` trong body — prefill chỉ đỡ công
  gõ, không thay thế được việc form phải submit đủ field.
- `guests` **không sửa được sau khi tạo** (`UpdateBookingPayload` không có
  field này, đã chốt) — nếu dựng luồng "sửa booking" đừng thêm input guests
  vào đó.

## 4. Convention bắt buộc khi viết code màn User (rút ra từ việc sửa `BookingHistoryPage`)

Tất cả các mục dưới đây từng là lỗi thật đã sửa — kiểm tra để không lặp lại:

- **i18n namespace phải được đăng ký trong `src/i18n/index.ts`** (`resources`
  + mảng `ns`) — `booking.json` từng tồn tại sẵn nhiều key nhưng **không ai
  đăng ký namespace**, khiến mọi `t()` gọi vào đó âm thầm fail và chỉ hiện
  nhờ chuỗi fallback hardcode. Tạo namespace mới thì **nhớ đăng ký ngay**.
- Trong component, gọi `useTranslation('tenNamespace')` rồi dùng key
  **không tiền tố** (`t('title')`, không phải `t('booking.title')`) — nếu
  cần lấy chéo từ `common`, dùng `useTranslation(['ns', 'common'])` rồi
  `t('common:common.key')` (xem `EditBookingModal.tsx` làm mẫu).
- **Không truyền chuỗi fallback làm tham số 2 của `t()`** (`t('key', 'Text')`)
  — key phải thật sự tồn tại trong file JSON, không dựa vào fallback để che
  namespace sai.
- **Toast dùng `react-toastify`** (`import { toast } from 'react-toastify'`),
  **không dùng `message` của AntD** — `BookingHistoryPage` từng là file DUY
  NHẤT dùng sai, đã sửa.
- **Loading dùng `components/common/PageLoader.tsx`** (`fullPage` prop),
  không dùng `<Spin>` của AntD trực tiếp — đây là loader duy nhất được phép
  dùng trong toàn app (xem comment trong chính file đó).
- Tái dùng component chung đã có sẵn thay vì tự viết lại:
  `components/PageHeader.tsx` (eyebrow/title/subtitle), `components/TabBar.tsx`
  (tab + badge số lượng), `components/Pagination.tsx` (không phải
  `Pagination` của AntD), `components/EmptyState.tsx` (icon + title + desc).
- **Lỗi/thông báo lấy qua `api/errorMessage.ts`**: `getErrorMessage(err, fallback)`
  và `getErrorStatusCode(err)` — không tự viết `error.response?.status` rải
  rác, không dùng `any` cho biến lỗi trong `catch`. Mã HTTP tra qua
  `constants/http.ts` (`HTTP_STATUS.CONFLICT`...), không hardcode số — thêm
  mã mới vào đó nếu cần (401/409 đã có).
- **Không hardcode màu** — dùng token trong `tokens/colors.ts`/class Tailwind
  tương ứng (`text-navy`, `bg-gold`, `text-danger`...) hoặc class dựng sẵn
  trong `index.css` (`.btn-primary`, `.btn-gold`, `.btn-outline`). Không viết
  `style={{background: '#0B2545'}}` hay `text-red-500`/`bg-[#xxxxx]` tuỳ tiện.
- **Badge trạng thái**: tái dùng `components/admin/StatusBadge.tsx` +
  `statusConfigs.ts` (đã có sẵn `BOOKING_STATUS_CONFIG`, `PAYMENT_STATUS_CONFIG`...)
  qua wrapper riêng cho phía User nếu cần (xem `components/BookingStatusBadge.tsx`
  làm mẫu) — không tự vẽ lại bảng màu/label lần 2.
- **Tầng API luôn đi theo cặp real+mock**, export
  `xxxApi = env.useMock ? xxxMockApi : xxxRealApi` — cả 2 phải cùng shape
  (TS sẽ tự bắt lỗi lệch qua `tsc --noEmit`). Response luôn unwrap
  `res.data.data` (khớp envelope `{statusCode, message, data}`). Field tiền
  (`pricePerNight`, `totalPrice`, `amount`) và mọi `id`/`*Id` **luôn là
  `string`** phía response — `Number(...)` khi cần tính toán, không parse
  `id` thành number.
- **Mock data dùng chung 1 nguồn** giữa các file mock (export mảng fixture,
  vd `rooms` từ `room.mock.ts`, `amenityCatalog` từ `amenity.mock.ts`) thay
  vì lặp lại dữ liệu — cẩn thận **không tạo circular import** giữa 2 file
  mock (chỉ import 1 chiều).
- **409 Conflict** ở `POST /bookings`/`PATCH /bookings/:id` phải bắt riêng
  (không gộp vào toast lỗi chung) — dùng
  `getErrorStatusCode(err) === HTTP_STATUS.CONFLICT` rồi hiện thông báo
  "chọn ngày/phòng khác" (xem `handleEditConfirm` trong
  `BookingHistoryPage.tsx` làm mẫu).

## 5. File tham chiếu nên mở song song khi code

- `frontend/src/pages/bookings/BookingHistoryPage.tsx` — ví dụ đầy đủ nhất
  hiện có cho 1 trang User áp đúng mọi convention ở mục 4 (viết lại gần đây,
  sạch type/lint).
- `frontend/src/pages/admin/bookings/AdminBookingListPage.tsx` — mẫu convention
  phía Admin (dùng để đối chiếu, không copy thẳng vì Admin dùng thêm
  `AdminTable`/`SearchInput`/`Dropdown` không cần cho trang User dạng card).
- `frontend/src/api/errorMessage.ts`, `frontend/src/constants/http.ts` —
  helper bắt lỗi.
- `frontend/src/tokens/colors.ts` + `frontend/src/index.css` (`@theme`,
  `@layer components`) — bảng màu + class dựng sẵn.
- `frontend/src/components/{PageHeader,TabBar,Pagination,EmptyState}.tsx`,
  `frontend/src/components/common/PageLoader.tsx` — component dùng chung.
- `frontend/src/router/paths.ts` + `frontend/src/router/index.tsx` — thêm
  route mới phải khai ở cả 2 nơi (`ROUTES.xxx` const trước, rồi đăng ký
  trong `createBrowserRouter`).

## 6. Đừng quên khi thêm route/trang mới

1. Thêm path vào `ROUTES` (`router/paths.ts`).
2. Đăng ký route trong `router/index.tsx` (đúng layout: `PublicLayout` trần,
   hay bọc thêm `AuthGuard` nếu cần đăng nhập).
3. Nếu trang mới thay thế 1 dead link đã ghi nhận trong `CAU_TRUC_ROUTE.md`/
   `DANH_SACH_MAN_HINH.md` — **quay lại sửa cờ 🚧 → ✅** ở đúng dòng đó,
   đừng để docs lỗi thời thêm 1 vòng nữa (đã xảy ra nhiều lần trong session
   trước, gây khó theo dõi).
4. Nếu trang cần namespace i18n mới — tạo file JSON (`en`/`vi`) + đăng ký
   ngay trong `i18n/index.ts` (xem mục 4, lỗi này đã xảy ra thật với
   `booking.json`).
