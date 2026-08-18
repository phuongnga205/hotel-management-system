import { createParamDecorator, ExecutionContext } from '@nestjs/common';

const BEARER_PREFIX = 'Bearer ';

export const GetRawToken = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest<import('express').Request>();
    const authHeader = request.headers.authorization;
    if (authHeader && authHeader.startsWith(BEARER_PREFIX)) {
      return authHeader.substring(BEARER_PREFIX.length);
    }
    return '';
  },
);
