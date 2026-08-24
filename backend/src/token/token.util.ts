import { Injectable } from '@nestjs/common';
import { RedisUtil } from './redis.util';
import * as crypto from 'crypto';

const REDIS_BL_KEY_PREFIX = 'blacklist:';
const REDIS_REVOKED_VALUE = '1';

const OTP_PREFIX = 'otp:';

export type OtpPurpose = 'EMAIL_VERIFICATION' | 'PASSWORD_RESET';

@Injectable()
export class TokenUtil {
  constructor(private readonly redisUtil: RedisUtil) {}

  private getBlacklistKey(token: string): string {
    const hash = crypto.createHash('sha256').update(token).digest('hex');
    return `${REDIS_BL_KEY_PREFIX}${hash}`;
  }

  async revokeAuthToken(token: string, ttl: number): Promise<void> {
    await this.redisUtil.save(
      this.getBlacklistKey(token),
      REDIS_REVOKED_VALUE,
      ttl,
    );
  }

  async isRevoked(token: string): Promise<boolean> {
    const result = await this.redisUtil.findOne(this.getBlacklistKey(token));
    return result === REDIS_REVOKED_VALUE;
  }

  private getOtpKey(purpose: OtpPurpose, userId: string): string {
    return `${OTP_PREFIX}${purpose}:${userId}`;
  }

  // Lưu OTP kích hoạt tài khoản / đặt lại mật khẩu — TTL tự hết hạn qua
  // Redis (EX), thay cho cột `expires_at` của bảng cũ. Ghi đè OTP cũ nếu
  // user request lại (register lần nữa trước khi kích hoạt, forgot-password
  // gọi lại...) — đúng hành vi "chỉ OTP mới nhất còn hiệu lực".
  async saveOtp(
    purpose: OtpPurpose,
    userId: string,
    otp: string,
    ttlSeconds: number,
  ): Promise<void> {
    await this.redisUtil.save(this.getOtpKey(purpose, userId), otp, ttlSeconds);
  }

  // So khớp OTP, KHÔNG tự xoá — service gọi `consumeOtp` sau khi xử lý xong
  // (kích hoạt tài khoản / đổi mật khẩu thành công) để đánh dấu đã dùng,
  // thay cho cột `used_at` cũ. Tách riêng 2 bước để tránh trường hợp OTP bị
  // xoá dù bước xử lý sau đó thất bại.
  async verifyOtp(
    purpose: OtpPurpose,
    userId: string,
    otp: string,
  ): Promise<boolean> {
    const stored = await this.redisUtil.findOne(
      this.getOtpKey(purpose, userId),
    );
    return stored !== null && stored === otp;
  }

  async consumeOtp(purpose: OtpPurpose, userId: string): Promise<void> {
    await this.redisUtil.delete(this.getOtpKey(purpose, userId));
  }
}
