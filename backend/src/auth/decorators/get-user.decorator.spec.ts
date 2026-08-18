import { ExecutionContext } from '@nestjs/common';
import { ROUTE_ARGS_METADATA } from '@nestjs/common/constants';
import { GetUser } from './get-user.decorator';

function getParamDecoratorFactory<T extends (...args: any[]) => any>(
  decorator: T,
) {
  class TestDecorator {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    public test(@decorator() _value: unknown) {}
  }

  const args = Reflect.getMetadata(
    ROUTE_ARGS_METADATA,
    TestDecorator,
    'test',
  ) as Record<
    string,
    { factory: (data: unknown, ctx: ExecutionContext) => unknown }
  >;

  return Object.values(args)[0].factory;
}

function buildMockContext(user: unknown): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ user }),
    }),
  } as unknown as ExecutionContext;
}

describe('GetUser decorator', () => {
  const factory = getParamDecoratorFactory(GetUser);

  const mockUser = {
    id: '1',
    email: 'test@mail.com',
    username: 'test',
    role: 'USER',
  };

  it('should return the whole user object when called without a key', () => {
    const result = factory(undefined, buildMockContext(mockUser));
    expect(result).toEqual(mockUser);
  });

  it("should return user.id when called with 'id'", () => {
    const result = factory('id', buildMockContext(mockUser));
    expect(result).toEqual('1');
  });

  it("should return undefined for 'sub' — JwtStrategy does not attach that field", () => {
    const result = factory('sub', buildMockContext(mockUser));
    expect(result).toBeUndefined();
  });
});
