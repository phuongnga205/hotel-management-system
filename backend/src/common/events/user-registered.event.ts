// Emit sau khi POST /auth/register lưu user thành công — nghe bởi
// NotificationsListener để gửi mail kích hoạt tài khoản.
export class UserRegisteredEvent {
  constructor(
    public readonly userId: string,
    public readonly email: string,
    public readonly username: string,
    // OTP thô (chưa hash) — chỉ tồn tại trong bộ nhớ để nhét vào email,
    // không bao giờ được lưu DB hay log lại.
    public readonly activationOtp: string,
  ) {}
}
