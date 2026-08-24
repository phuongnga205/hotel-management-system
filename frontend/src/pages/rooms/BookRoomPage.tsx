// TODO(session sau): BookRoomPage — /rooms/:roomId/book (can AuthGuard - dat trong nhanh
// AuthGuard cua router/index.tsx, giong /profile va /bookings)
// Doc bat buoc doc truoc: frontend/docs/bridge.md muc 6, backend/docs/DANH_SACH_API.md muc 4,
// frontend/docs/CAU_TRUC_ROUTE.md muc B, frontend/docs/DANH_SACH_MAN_HINH.md muc C,
// frontend/docs/SO_TAY_MAN_HINH_USER_CON_LAI.md muc 3 (BAT BUOC doc truoc khi lam form nay).
//
// - Lay :roomId tu useParams(), goi roomApi.getPublicById(roomId) de biet pricePerNight/capacity/
//   name cho phan tom tat + validate client-side.
// - Doc query string luc mount (?checkIn=&checkOut=&guests=):
//   - Co du 3 -> prefill form (nhung van cho sua lai, khong khoa field).
//   - Khong co -> form trong/default (guests: 1, chua chon ngay) - day la case vao thang khong qua
//     search (vd nut "Dat phong" o HomePage.tsx hien navigate tron, khong kem query).
// - Form fields: checkInDate, checkOutDate, guests (bat buoc, so nguyen), note (optional).
// - Validate client-side guests <= room.capacity TRUOC khi submit (UX nhanh hon), nhung BE van
//   validate lai lan cuoi (400 GUESTS_EXCEED_CAPACITY neu vuot - van phai handle case nay tra ve
//   tu API du da chan o client).
// - Hien totalPrice UOC TINH = nights * Number(room.pricePerNight) * guests ngay tren form truoc
//   khi submit (dung cong thuc BE that, xem bridge.md muc 6) - chi la uoc tinh hien thi, KHONG gui
//   len BE (totalPrice luon do server tu tinh).
// - Submit -> bookingApi.create({ roomId, checkInDate, checkOutDate, guests, note }) (CreateBookingPayload,
//   guests gio la field BAT BUOC trong type nay).
// - Bat rieng loi 409 Conflict (getErrorStatusCode(err) === HTTP_STATUS.CONFLICT) - hien thong bao
//   "phong da duoc dat, chon ngay/phong khac" thay vi toast loi chung, goi y quay lai /rooms (xem
//   handleEditConfirm trong pages/bookings/BookingHistoryPage.tsx lam mau xu ly 409 tuong tu).
// - Thanh cong -> toast + navigate ve ROUTES.BOOKINGS (/bookings).
// - Component tai su dung: components/PriceSummaryCard.tsx (co san prop `meta` de nhet dong "So
//   khach" vao khong dung sua lai cong thuc gia trong component), components/common/PageLoader.tsx,
//   components/DateRangeBar.tsx co the tai su dung phan chon ngay/guests (component nay da co san
//   UI chon guests, dang dung o HomePage.tsx).
// - i18n: dung chung namespace 'rooms' hoac 'booking' (can nghi lai luc code - phan lon text lien
//   quan booking neu dung lai duoc key co san trong booking.json thi uu tien dung lai).
// - Sau khi dung xong: quay lai sua co 🚧 -> ✅ o dong BookRoomPage trong CAU_TRUC_ROUTE.md va
//   DANH_SACH_MAN_HINH.md, dang ky route trong router/index.tsx (ROUTES.BOOK_ROOM da co san,
//   nho boc trong AuthGuard).

export default function BookRoomPage() {
  return null
}
