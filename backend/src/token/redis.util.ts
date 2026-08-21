import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { ENVIRONMENT_KEYS } from '../config/environment.constants';

const RELEASE_LOCK_SCRIPT =
  'if redis.call("get", KEYS[1]) == ARGV[1] then return redis.call("del", KEYS[1]) else return 0 end';
const EXTEND_LOCK_SCRIPT =
  'if redis.call("get", KEYS[1]) == ARGV[1] then return redis.call("expire", KEYS[1], ARGV[2]) else return 0 end';
const REDIS_EVAL_COMMAND = 'EVAL';

@Injectable()
export class RedisUtil implements OnModuleInit, OnModuleDestroy {
  private client!: Redis;

  constructor(private configService: ConfigService) {}

  onModuleInit() {
    this.client = new Redis({
      host: this.configService.getOrThrow<string>(ENVIRONMENT_KEYS.REDIS_HOST),
      port: this.configService.getOrThrow<number>(ENVIRONMENT_KEYS.REDIS_PORT),
    });
  }

  onModuleDestroy() {
    this.client.disconnect();
  }

  async save(key: string, value: string, ttlSeconds: number): Promise<void> {
    if (ttlSeconds > 0) {
      await this.client.set(key, value, 'EX', ttlSeconds);
    }
  }

  async findOne(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  async delete(key: string): Promise<void> {
    await this.client.del(key);
  }

  async acquireLock(
    key: string,
    token: string,
    ttlSeconds: number,
  ): Promise<boolean> {
    const result = await this.client.set(key, token, 'EX', ttlSeconds, 'NX');
    return result === 'OK';
  }

  async releaseLock(key: string, token: string): Promise<void> {
    await this.client.call(
      REDIS_EVAL_COMMAND,
      RELEASE_LOCK_SCRIPT,
      1,
      key,
      token,
    );
  }

  async extendLock(
    key: string,
    token: string,
    ttlSeconds: number,
  ): Promise<boolean> {
    const result = await this.client.call(
      REDIS_EVAL_COMMAND,
      EXTEND_LOCK_SCRIPT,
      1,
      key,
      token,
      ttlSeconds,
    );
    return result === 1;
  }
}
