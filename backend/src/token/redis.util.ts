import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

export const DEFAULT_REDIS_PORT = 6379;

@Injectable()
export class RedisUtil implements OnModuleInit, OnModuleDestroy {
  private client: Redis;

  constructor(private configService: ConfigService) {}

  onModuleInit() {
    this.client = new Redis({
      host: this.configService.get<string>('REDIS_HOST'),
      port: this.configService.get<number>('REDIS_PORT') || DEFAULT_REDIS_PORT,
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
}
