// TODO(session sau): PaymentHistoryPage — /payments (can AuthGuard)
// Doc bat buoc doc truoc: frontend/docs/bridge.md muc 7, backend/docs/DANH_SACH_API.md muc 4a,
// frontend/docs/DANH_SACH_MAN_HINH.md muc E.
//
// - ⚠️ CHUA CO CA TANG API: api/payment.api.ts hien chi co adminList() (GET /admin/payments).
//   Phai viet them method moi truoc (vd listMine(query)) goi GET /payments/me, cung type
//   ListPaymentsQuery (kiem tra types.ts truoc khi tao trung) - roi moi lam duoc UI trang nay.
//   payment.mock.ts cung phai them ham mock tuong ung.
// - GET /payments/me KHONG scope theo 1 booking cu the - tra TOAN BO giao dich cua user hien tai,
//   gop tu moi booking ho tung co (giong cach GET /bookings/me khong scope theo phong).
// - Query: page, limit, status (PaymentStatus), method (PaymentMethod) - tat ca optional.
// - Response moi item kem tom tat booking (booking.roomName, booking.roomNumber, booking.checkInDate,
//   booking.checkOutDate) de phan biet giao dich nao ung voi booking nao - KHONG kem thong tin
//   khach (khac ban Admin, vi user tu biet do la chinh minh).
// - Cau truc trang nen giong pages/bookings/BookingHistoryPage.tsx (vua duoc viet lai sach, dung
//   lam mau convention): PageHeader, TabBar loc theo status/method (hoac Dropdown neu nhieu chieu
//   loc), Pagination, PageLoader, EmptyState khi chua co giao dich nao.
// - Co nut/link dan toi day tu BookingHistoryPage hoac menu tai khoan (Header.tsx) - hien chua co,
//   can them khi dung xong trang nay.
// - i18n: tao namespace 'payment' moi (chua ton tai) - nho dang ky trong i18n/index.ts (day la loi
//   that tung xay ra voi booking.json, dung quen buoc nay).
// - Sau khi dung xong: quay lai sua co 🚧 -> ✅ o dong PaymentHistoryPage trong CAU_TRUC_ROUTE.md
//   va DANH_SACH_MAN_HINH.md, them ROUTES.PAYMENTS vao router/paths.ts (hien CHUA co) + dang ky
//   route trong router/index.tsx, them link dan vao tu BookingHistoryPage/Header.

export function PaymentHistoryPage() {
  return null
}
