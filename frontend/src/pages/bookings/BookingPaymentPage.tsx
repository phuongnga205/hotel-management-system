// TODO(session sau): BookingPaymentPage — /bookings/:bookingId/payment (can AuthGuard)
// UU TIEN CAO NHAT trong so cac man con thieu — nut "Pay" o BookingCard/BookingHistoryPage.tsx
// (handlePay) DA navigate toi route nay, dang la dead link that (bam duoc nhung khong toi dau).
// Doc bat buoc doc truoc: frontend/docs/bridge.md muc 6 + 7, backend/docs/DANH_SACH_API.md muc 4
// (doan "2 tinh huong hop le de goi .../pay"), frontend/docs/DANH_SACH_MAN_HINH.md muc E.
//
// - Lay :bookingId tu useParams(), goi bookingApi.getById(bookingId) de hien tom tat booking
//   (room, ngay, totalPrice) truoc khi cho chon phuong thuc thanh toan.
// - Form: chon method (PaymentMethod = 'CASH' | 'BANK_TRANSFER' | 'CREDIT_CARD' | 'VNPAY').
// - Submit -> bookingApi.pay(bookingId, { method }) (PayBookingPayload) - CHI gui method, KHONG
//   gui amount (BE luon tu lay tu booking.totalPrice, khong tin so tien tu FE).
// - Mock hien tai (booking.mock.ts) luon tra SUCCESS ngay lap tuc - KHONG can polling/callback,
//   goi xong 1 lan la coi nhu hoan tat.
// - 2 tinh huong hop le (ca 2 deu phai cho nut Pay hien ra dung luc, xem dieu kien o BookingCard.tsx
//   hien tai: canPay = status === 'ACCEPTED' && payment?.status !== 'SUCCESS'):
//   1. Booking PENDING + hold con han -> tra SUCCESS xong tu chuyen ACCEPTED.
//   2. Booking da ACCEPTED nhung chua co payment SUCCESS nao (Admin accept thang, chua thu tien)
//      -> "tra bu", khong doi status, chi them 1 Payment SUCCESS moi.
// - Bat 409 Conflict (getErrorStatusCode(err) === HTTP_STATUS.CONFLICT): booking da
//   REJECTED/CANCELLED/EXPIRED, hoac PENDING nhung hold het han, hoac da co payment SUCCESS truoc
//   do (chan tra trung lan 2) - hien thong bao rieng cho tung case neu co the, it nhat phai khac
//   toast loi chung.
// - Thanh cong -> toast + navigate ve ROUTES.BOOKINGS (/bookings), danh sach se tu refresh trang
//   thai booking do.
// - Component tai su dung: components/common/PageLoader.tsx, co the tai su dung 1 phan UI tu
//   components/PriceSummaryCard.tsx de hien tong tien can tra.
// - i18n: dung chung namespace 'booking' (booking.json da co key buttons.payNow, co the can them
//   key moi cho man nay - nho dang ky neu tao namespace/file JSON moi).
// - Sau khi dung xong: quay lai sua co 🚧 -> ✅ + xoa canh bao "dead link" o dong BookingPaymentPage
//   trong CAU_TRUC_ROUTE.md va DANH_SACH_MAN_HINH.md, them ROUTES.BOOKING_PAYMENT vao
//   router/paths.ts (hien CHUA co hang rieng, handlePay dang tu ghep chuoi
//   `${ROUTES.BOOKINGS}/${id}/payment`) + dang ky route trong router/index.tsx.

export function BookingPaymentPage() {
  return null
}
