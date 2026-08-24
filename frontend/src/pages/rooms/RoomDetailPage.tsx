// TODO(session sau): RoomDetailPage — /rooms/:roomId
// Doc bat buoc doc truoc: frontend/docs/bridge.md muc 3 + 8, backend/docs/DANH_SACH_API.md muc 3 + 5,
// frontend/docs/DANH_SACH_MAN_HINH.md muc C, frontend/docs/SO_TAY_MAN_HINH_USER_CON_LAI.md.
//
// - Lay :roomId tu useParams(), goi roomApi.getPublicById(roomId) (GET /rooms/:id, cong khai,
//   khong can login).
// - Goi them reviewApi.listByRoom(roomId, query) (GET /rooms/:roomId/reviews, phan trang) de hien
//   danh sach danh gia - API nay da hoat dong that (dung trong HomePage.tsx cho carousel review,
//   xem file do lam mau), chi la trang nay chua ton tai de noi vao.
// - Hien thi room.capacity dang "up to N guests" (xem cach components/RoomCard.tsx dang lam qua
//   key i18n common:roomCard.upToGuests).
// - Nut "Dat phong":
//   - Guest (chua dang nhap) -> navigate ROUTES.LOGIN + `?redirect=` tro ve dung trang nay.
//   - Da dang nhap -> navigate ROUTES.BOOK_ROOM(roomId), GIU NGUYEN query checkIn/checkOut/guests
//     dang co tren URL trang nay (doc lai bang useSearchParams() luc mount, xem
//     SO_TAY_MAN_HINH_USER_CON_LAI.md muc 3 - 2 case co/khong co query).
// - Component tai su dung: components/PageHeader.tsx, components/common/PageLoader.tsx,
//   components/EmptyState.tsx (khi phong chua co review nao), components/StarRating.tsx (hien
//   diem trung binh/tung review), components/AmenityPill.tsx (hien room.amenities).
// - Loi goi getErrorMessage()/getErrorStatusCode() tu api/errorMessage.ts.
// - i18n: dung chung namespace 'rooms' se tao cho RoomListPage.
// - Sau khi dung xong: quay lai sua co 🚧 -> ✅ o dong RoomDetailPage trong CAU_TRUC_ROUTE.md va
//   DANH_SACH_MAN_HINH.md, dang ky route trong router/index.tsx (ROUTES.ROOM_DETAIL da co san).

export default function RoomDetailPage() {
  return null
}
