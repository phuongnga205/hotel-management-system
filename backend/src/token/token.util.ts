import { Injectable } from '@nestjs/common';
import { RedisUtil } from './redis.util';

const TOKEN_BLACKLIST_PREFIX = 'blacklist:';
const TOKEN_REVOKED_VALUE = '1';

@Injectable()
export class TokenUtil {
  constructor(private readonly redisUtil: RedisUtil) {}

  private getBlacklistKey(token: string): string {
    return `${TOKEN_BLACKLIST_PREFIX}${token}`;
  }

  async revokeAuthToken(token: string, ttl: number): Promise<void> {
    await this.redisUtil.save(
      this.getBlacklistKey(token),
      TOKEN_REVOKED_VALUE,
      ttl,
    );
  }

  async isRevoked(token: string): Promise<boolean> {
    const result = await this.redisUtil.findOne(this.getBlacklistKey(token));
    return result === TOKEN_REVOKED_VALUE;
  }
}
