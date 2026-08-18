import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

import { ThrottlerGuard } from '@nestjs/throttler';
import { TokenUtil } from '../token/token.util';
import { JwtService } from '@nestjs/jwt';
import { I18nService } from 'nestjs-i18n';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: {
    register: jest.Mock;
    activate: jest.Mock;
    forgotPassword: jest.Mock;
    resetPassword: jest.Mock;
    login: jest.Mock;
    logout: jest.Mock;
  };

  beforeEach(async () => {
    authService = {
      register: jest.fn(),
      activate: jest.fn(),
      forgotPassword: jest.fn(),
      resetPassword: jest.fn(),
      login: jest.fn(),
      logout: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: authService,
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

  it('activate() should delegate to AuthService.activate', async () => {
    const dto = { email: 'test@mail.com', otp: '123456' };
    authService.activate.mockResolvedValue({ message: 'ok' });

    const result = await controller.activate(dto);

    expect(authService.activate).toHaveBeenCalledWith(dto);
    expect(result).toEqual({ message: 'ok' });
  });

  it('forgotPassword() should delegate to AuthService.forgotPassword', async () => {
    const dto = { email: 'test@mail.com' };
    authService.forgotPassword.mockResolvedValue({ message: 'ok' });

    const result = await controller.forgotPassword(dto);

    expect(authService.forgotPassword).toHaveBeenCalledWith(dto);
    expect(result).toEqual({ message: 'ok' });
  });

  it('resetPassword() should delegate to AuthService.resetPassword', async () => {
    const dto = {
      email: 'test@mail.com',
      otp: '123456',
      newPassword: 'newPass123',
    };
    authService.resetPassword.mockResolvedValue({ message: 'ok' });

    const result = await controller.resetPassword(dto);

    expect(authService.resetPassword).toHaveBeenCalledWith(dto);
    expect(result).toEqual({ message: 'ok' });
  });
});
