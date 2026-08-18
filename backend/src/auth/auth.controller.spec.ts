import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

import { ThrottlerGuard } from '@nestjs/throttler';
import { TokenUtil } from '../token/token.util';
import { JwtService } from '@nestjs/jwt';
import { I18nService } from 'nestjs-i18n';

describe('AuthController', () => {
  let controller: AuthController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: {},
        },
        {
          provide: TokenUtil,
          useValue: {},
        },
        {
          provide: JwtService,
          useValue: {},
        },
        {
          provide: I18nService,
          useValue: {},
        },
      ],
    })
      .overrideGuard(ThrottlerGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
