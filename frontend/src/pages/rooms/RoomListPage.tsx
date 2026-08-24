// TODO(session sau): RoomListPage — /rooms
// Doc bat buoc doc truoc: frontend/docs/bridge.md muc 3, backend/docs/DANH_SACH_API.md muc 3,
// frontend/docs/DANH_SACH_MAN_HINH.md muc C, frontend/docs/SO_TAY_MAN_HINH_USER_CON_LAI.md.
//
// - Doc query string luc mount: checkIn, checkOut, guests (co the them minPrice/maxPrice/amenities
//   sau nay). Neu co ca checkIn + checkOut -> goi roomApi.listAvailable(query: ListAvailableRoomsQuery)
//   (GET /rooms/available, da co san trong room.api.ts, chua tung duoc goi o dau ca).
//   Neu khong -> goi roomApi.listPublic(query: ListRoomsQuery) (GET /rooms, da dung that o
//   HomePage.tsx cho phan "phong noi bat" - lam mau tham khao).
// - guests (neu co) truyen thang vao ca 2 API tren de loc theo room.capacity >= guests - da
//   support san o BE, khong can tu loc lai o FE.
// - Component tai su dung: components/RoomCard.tsx (RoomGridCard/RoomListCard - xem file de biet
//   props), components/PageHeader.tsx, components/Pagination.tsx (KHONG dung Pagination cua AntD),
//   components/common/PageLoader.tsx (KHONG dung <Spin> truc tiep), components/EmptyState.tsx khi
//   khong co ket qua.
// - Loi goi getErrorMessage()/getErrorStatusCode() tu api/errorMessage.ts, toast qua react-toastify
//   (KHONG dung message cua AntD).
// - Bam vao 1 phong -> navigate ROUTES.ROOM_DETAIL(room.id), GIU NGUYEN query checkIn/checkOut/guests
//   tren URL (xem SO_TAY_MAN_HINH_USER_CON_LAI.md muc 3 - mang query xuyen suot, khong bat user
//   dien lai o trang sau).
// - i18n: chua co namespace rieng cho rooms - tao file locales/{en,vi}/rooms.json + dang ky trong
//   i18n/index.ts (dung quen buoc dang ky, tung la bug that voi booking.json).
// - Sau khi dung xong: quay lai sua co 🚧 -> ✅ o dong RoomListPage trong CAU_TRUC_ROUTE.md va
//   DANH_SACH_MAN_HINH.md, dang ky route trong router/paths.ts (da co ROUTES.ROOMS) + router/index.tsx.

export default function RoomListPage() {
  return null
}
