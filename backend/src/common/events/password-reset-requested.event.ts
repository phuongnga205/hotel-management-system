// Emit khi POST /auth/forgot-password xử lý xong cho 1 email tồn tại trong
// hệ thống — nghe bởi NotificationsListener để gửi mail đặt lại mật khẩu.
export class PasswordResetRequestedEvent {
  constructor(
    public readonly userId: string,
    public readonly email: string,
    public readonly username: string,
    public readonly resetOtp: string,
  ) {}
}
