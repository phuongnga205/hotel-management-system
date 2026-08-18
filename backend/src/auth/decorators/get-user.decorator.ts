import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const GetUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext): unknown => {
    const request = ctx
      .switchToHttp()
      .getRequest<
        import('express').Request & { user?: Record<string, unknown> }
      >();
    if (data) {
      return request.user?.[data];
    }
    return request.user;
  },
);
