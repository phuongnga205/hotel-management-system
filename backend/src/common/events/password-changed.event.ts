// Emit khi mật khẩu được đổi thành công — cả 2 luồng: tự đổi khi đã đăng
// nhập (PATCH /users/me/password) và đặt lại qua email (POST
// /auth/reset-password). Dùng để cảnh báo chủ tài khoản qua email.
export class PasswordChangedEvent {
  constructor(
    public readonly userId: string,
    public readonly email: string,
    public readonly username: string,
  ) {}
}
