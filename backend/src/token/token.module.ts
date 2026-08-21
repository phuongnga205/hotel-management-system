import { Global, Module } from '@nestjs/common';
import { TokenUtil } from './token.util';
import { RedisUtil } from './redis.util';

@Global()
@Module({
  providers: [TokenUtil, RedisUtil],
  exports: [TokenUtil, RedisUtil],
})
export class TokenModule {}
