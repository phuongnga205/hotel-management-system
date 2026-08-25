// Dùng chung cho mọi query list ở Admin cần sort theo thời gian (mới nhất/
// cũ nhất trước) - bookings/rooms/users/reviews... thay vì mỗi module tự
// định nghĩa lại 1 enum ASC/DESC riêng.
export enum SortOrder {
  ASC = 'ASC',
  DESC = 'DESC',
}
