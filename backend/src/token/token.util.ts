import { Injectable } from '@nestjs/common';
import { RedisUtil } from './redis.util';
import * as crypto from 'crypto';

const REDIS_BL_KEY_PREFIX = 'blacklist:';
const REDIS_REVOKED_VALUE = '1';

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
}
