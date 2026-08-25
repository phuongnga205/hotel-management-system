import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import {
  ENVIRONMENT_KEYS,
  parseNetworkPort,
} from '../config/environment.constants';
import { InvalidRedisTtlError } from './errors/invalid-redis-ttl.error';

const RELEASE_LOCK_SCRIPT =
  'if redis.call("get", KEYS[1]) == ARGV[1] then return redis.call("del", KEYS[1]) else return 0 end';
const EXTEND_LOCK_SCRIPT =
  'if redis.call("get", KEYS[1]) == ARGV[1] then return redis.call("expire", KEYS[1], ARGV[2]) else return 0 end';
const COMPARE_AND_DELETE_SCRIPT =
  'if redis.call("get", KEYS[1]) == ARGV[1] then return redis.call("del", KEYS[1]) else return 0 end';
const REDIS_EVAL_COMMAND = 'EVAL';

@Injectable()
export class RedisUtil implements OnModuleInit, OnModuleDestroy {
  private client!: Redis;

  constructor(private configService: ConfigService) {}

  onModuleInit() {
    this.client = new Redis({
      host: this.configService.getOrThrow<string>(ENVIRONMENT_KEYS.REDIS_HOST),
      port: parseNetworkPort(
        this.configService.getOrThrow<string | number>(
          ENVIRONMENT_KEYS.REDIS_PORT,
        ),
        ENVIRONMENT_KEYS.REDIS_PORT,
      ),
    });
  }

  onModuleDestroy() {
    this.client.disconnect();
  }

  async save(key: string, value: string, ttlSeconds: number): Promise<void> {
    if (!Number.isInteger(ttlSeconds) || ttlSeconds <= 0) {
      throw new InvalidRedisTtlError();
    }
    await this.client.set(key, value, 'EX', ttlSeconds);
  }

  async findOne(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  async delete(key: string): Promise<void> {
    await this.client.del(key);
  }

  async compareAndDelete(key: string, expectedValue: string): Promise<boolean> {
    const result = await this.client.call(
      REDIS_EVAL_COMMAND,
      COMPARE_AND_DELETE_SCRIPT,
      1,
      key,
      expectedValue,
    );
    return result === 1;
  }

  async lpush(key: string, value: string): Promise<void> {
    await this.client.lpush(key, value);
  }

  async rpop(key: string): Promise<string | null> {
    return this.client.rpop(key);
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
