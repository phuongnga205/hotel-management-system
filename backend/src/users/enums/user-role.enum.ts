// Nguồn định nghĩa gốc của UserRole nằm ở `user.entity.ts` (thuộc feature auth,
// nơi enum này được dùng nhiều nhất). File này chỉ re-export lại để các module
// khác (rooms, auth guards...) import qua đường dẫn ổn định `users/enums/...`
// mà không tạo ra 2 khai báo enum trùng lặp, khác nominal type trong TypeScript.
export { UserRole } from '../entities/user.entity';
