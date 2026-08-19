// Độ dài mã OTP gửi qua email (kích hoạt tài khoản / đặt lại mật khẩu) —
// đủ ngắn để người dùng gõ tay, không cần bấm link.
export const OTP_LENGTH = 6;
export const OTP_MIN = 0;
export const OTP_MAX_EXCLUSIVE = 10 ** OTP_LENGTH;

// OTP có không gian giá trị nhỏ (10^6) nên TTL phải ngắn hơn nhiều so với
// token ngẫu nhiên trước đây, để giảm cửa sổ brute-force.
export const ACTIVATION_OTP_TTL_MS = 10 * 60 * 1000; // 10 phút
export const PASSWORD_RESET_OTP_TTL_MS = 10 * 60 * 1000; // 10 phút
