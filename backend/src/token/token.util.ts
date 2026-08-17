import { Injectable } from '@nestjs/common';
import { RedisUtil } from './redis.util';

@Injectable()
export class TokenUtil {
  constructor(private readonly redisUtil: RedisUtil) {}

  async revokeAuthToken(token: string, ttl: number): Promise<void> {
    await this.redisUtil.save(`blacklist:${token}`, '1', ttl);
  }

  async isRevoked(token: string): Promise<boolean> {
    const result = await this.redisUtil.findOne(`blacklist:${token}`);
    return result === '1';
  }
}
