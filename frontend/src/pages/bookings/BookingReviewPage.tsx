// TODO(session sau): BookingReviewPage — /bookings/:bookingId/review (can AuthGuard)
// Doc bat buoc doc truoc: frontend/docs/bridge.md muc 8, backend/docs/DANH_SACH_API.md muc 5,
// frontend/docs/DANH_SACH_MAN_HINH.md muc E.
//
// - Khac BookingPaymentPage: hien tai KHONG co nut/link nao dan vao trang nay ca (BookingCard.tsx
//   chua co onReview prop) - phai them nut "Viet danh gia" vao BookingCard.tsx/BookingHistoryPage.tsx
//   TRUOC, chi hien khi du dieu kien (xem gach dau dong ke tiep), roi moi dung trang nay.
// - Dieu kien de duoc review (BE tu kiem tra lai, nhung FE nen an nut neu chua du de tranh submit
//   roi bi 400): booking thuoc ve chinh user, da ACCEPTED, da thanh toan thanh cong (payment.status
//   === 'SUCCESS'), va da qua checkOutDate. Moi booking chi review duoc 1 lan (409 neu da review).
// - Lay :bookingId tu useParams(). Form: rating (so nguyen 1-5, tai su dung
//   components/StarRating.tsx), comment (optional, toi da 2000 ky tu).
// - Submit -> reviewApi.create(bookingId, rating, comment) (POST /reviews) - roomId/userId BE tu
//   suy ra tu booking, FE KHONG gui 2 field nay.
// - Bat rieng:
//   - 400: booking chua hoan thanh (chua ACCEPTED/chua thanh toan/chua checkout).
//   - 404: khong tim thay booking cua user nay.
//   - 409: booking da duoc review truoc do.
// - Thanh cong -> toast + navigate ve ROUTES.BOOKINGS (/bookings).
// - i18n: dung chung namespace 'booking', hoac tao 'review' rieng neu can nhieu key - nho dang ky
//   trong i18n/index.ts neu tao file JSON moi.
// - Sau khi dung xong: them nut "Viet danh gia" vao BookingCard.tsx (props onReview + dieu kien
//   hien nhu tren), quay lai sua co 🚧 -> ✅ o dong BookingReviewPage trong CAU_TRUC_ROUTE.md va
//   DANH_SACH_MAN_HINH.md, them ROUTES.BOOKING_REVIEW vao router/paths.ts + dang ky route trong
//   router/index.tsx.

export function BookingReviewPage() {
  return null
}
