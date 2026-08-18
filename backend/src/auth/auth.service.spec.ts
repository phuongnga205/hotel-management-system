/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unused-vars */
import { Test, TestingModule } from '@nestjs/testing';
import { AuthService, BCRYPT_SALT_ROUNDS } from './auth.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User, UserStatus, UserRole } from '../users/entities/user.entity';
import { AuthToken, AuthTokenType } from './entities/auth-token.entity';
import { JwtService } from '@nestjs/jwt';
import { I18nService } from 'nestjs-i18n';
import { TokenUtil } from '../token/token.util';
import { DataSource } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import * as bcrypt from 'bcrypt';
import {
  UnauthorizedException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { AppEvent } from '../common/events/event-names.constants';

import * as crypto from 'crypto';

jest.mock('bcrypt');

// Phải hash y hệt AuthService.hashOtp() (private) để dựng dữ liệu giả lập
// khớp với tokenHash mà service sẽ tự tính khi tra cứu.
function hashOtp(userId: string, otp: string): string {
  return crypto.createHash('sha256').update(`${userId}:${otp}`).digest('hex');
}

describe('AuthService', () => {
  let service: AuthService;
  let userRepository: any;
  let authTokenRepository: any;
  let jwtService: any;
  let i18nService: any;
  let tokenUtil: any;
  let eventEmitter: any;
  let manager: any;

  beforeEach(async () => {
    const mockUserRepository = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };
    const mockJwtService = {
      decode: jest.fn(),
      sign: jest.fn(),
    };
    const mockI18nService = {
      t: jest.fn((key: string) => key),
    };
    const mockTokenUtil = {
      revokeAuthToken: jest.fn(),
    };
    const mockAuthTokenRepository = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };
    manager = {
      save: jest.fn().mockResolvedValue(undefined),
      create: jest.fn((_entity: any, data: any): any => data),
      update: jest.fn().mockResolvedValue(undefined),
    };
    const mockDataSource = {
      transaction: jest.fn((cb: any): any => cb(manager)),
    };
    const mockEventEmitter = {
      emit: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getRepositoryToken(User), useValue: mockUserRepository },
        {
          provide: getRepositoryToken(AuthToken),
          useValue: mockAuthTokenRepository,
        },
        { provide: JwtService, useValue: mockJwtService },
        { provide: I18nService, useValue: mockI18nService },
        { provide: TokenUtil, useValue: mockTokenUtil },
        { provide: DataSource, useValue: mockDataSource },
        { provide: EventEmitter2, useValue: mockEventEmitter },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    userRepository = module.get(getRepositoryToken(User));
    authTokenRepository = module.get(getRepositoryToken(AuthToken));
    jwtService = module.get(JwtService);
    i18nService = module.get(I18nService);
    tokenUtil = module.get(TokenUtil);
    eventEmitter = module.get(EventEmitter2);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('logout', () => {
    it('should calculate ttl and revoke token', async () => {
      const token = 'testToken';
      const currentTime = Math.floor(Date.now() / 1000);
      const exp = currentTime + 3600; // 1 hour
      jwtService.decode.mockReturnValue({ exp });

      const result = await service.logout(token);

      expect(jwtService.decode).toHaveBeenCalledWith(token);
      expect(tokenUtil.revokeAuthToken).toHaveBeenCalledWith(
        token,
        expect.any(Number),
      );
      expect(result).toEqual({ message: 'messages.AUTH.LOGOUT_SUCCESS' });
    });

    it('should ignore if token decode fails', async () => {
      jwtService.decode.mockReturnValue(null);
      await service.logout('token');
      expect(tokenUtil.revokeAuthToken).not.toHaveBeenCalled();
    });
  });

  describe('register', () => {
    const registerDto = {
      email: 'test@mail.com',
      password: 'pass',
      username: 'test',
      phone: '123',
    } as any;

    it('should register successfully', async () => {
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedPass');
      userRepository.create.mockReturnValue({
        ...registerDto,
        password: 'hashedPass',
      });

      const result = await service.register(registerDto);

      expect(bcrypt.hash).toHaveBeenCalledWith('pass', BCRYPT_SALT_ROUNDS);
      expect(manager.save).toHaveBeenCalled();
      expect(result.message).toEqual('messages.AUTH.REGISTER_SUCCESS');
      // 1 email kích hoạt phải được emit kèm OTP 6 chữ số, không phải link.
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        AppEvent.USER_REGISTERED,
        expect.objectContaining({
          email: registerDto.email,
          username: registerDto.username,
          activationOtp: expect.stringMatching(/^\d{6}$/) as string,
        }),
      );
    });

    it('should throw ConflictException on code 23505', async () => {
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedPass');
      userRepository.create.mockReturnValue({
        ...registerDto,
        password: 'hashedPass',
      });
      manager.save.mockRejectedValue({ code: '23505' });

      await expect(service.register(registerDto)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should throw generic error if not 23505', async () => {
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedPass');
      userRepository.create.mockReturnValue({
        ...registerDto,
        password: 'hashedPass',
      });
      manager.save.mockRejectedValue(new Error('DB error'));

      await expect(service.register(registerDto)).rejects.toThrow('DB error');
    });
  });

  describe('activate', () => {
    const dto = { email: 'test@mail.com', otp: '123456' };
    const mockUser = { id: '1', email: dto.email, username: 'test' };

    it('should activate the account and mark the OTP as used', async () => {
      userRepository.findOne.mockResolvedValue(mockUser);
      authTokenRepository.findOne.mockResolvedValue({
        id: 'tok-1',
        userId: mockUser.id,
        tokenHash: hashOtp(mockUser.id, dto.otp),
        type: AuthTokenType.EMAIL_VERIFICATION,
        expiresAt: new Date(Date.now() + 60_000),
        usedAt: null,
      });

      const result = await service.activate(dto);

      expect(manager.update).toHaveBeenCalledWith(User, mockUser.id, {
        status: UserStatus.ACTIVE,
      });
      expect(manager.update).toHaveBeenCalledWith(
        AuthToken,
        'tok-1',
        expect.objectContaining({ usedAt: expect.any(Date) as Date }),
      );
      expect(result.message).toEqual('messages.AUTH.ACTIVATE_SUCCESS');
    });

    it('should throw BadRequestException if email does not exist', async () => {
      userRepository.findOne.mockResolvedValue(null);

      await expect(service.activate(dto)).rejects.toThrow(BadRequestException);
      expect(authTokenRepository.findOne).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException if no matching OTP is found', async () => {
      userRepository.findOne.mockResolvedValue(mockUser);
      authTokenRepository.findOne.mockResolvedValue(null);

      await expect(service.activate(dto)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if the OTP has expired', async () => {
      userRepository.findOne.mockResolvedValue(mockUser);
      authTokenRepository.findOne.mockResolvedValue({
        id: 'tok-1',
        userId: mockUser.id,
        tokenHash: hashOtp(mockUser.id, dto.otp),
        type: AuthTokenType.EMAIL_VERIFICATION,
        expiresAt: new Date(Date.now() - 60_000),
        usedAt: null,
      });

      await expect(service.activate(dto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('forgotPassword', () => {
    const dto = { email: 'test@mail.com' };

    it('should not create a token or emit an event when the email does not exist', async () => {
      userRepository.findOne.mockResolvedValue(null);

      const result = await service.forgotPassword(dto);

      expect(mockDataSourceTransactionCalls()).toBe(0);
      expect(eventEmitter.emit).not.toHaveBeenCalled();
      // Cùng 1 message dù email tồn tại hay không, tránh lộ thông tin.
      expect(result.message).toEqual('messages.AUTH.FORGOT_PASSWORD_SUCCESS');
    });

    it('should create a reset OTP and emit PasswordResetRequested when the email exists', async () => {
      const mockUser = { id: '1', email: dto.email, username: 'test' };
      userRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.forgotPassword(dto);

      expect(manager.update).toHaveBeenCalledWith(
        AuthToken,
        expect.objectContaining({
          userId: mockUser.id,
          type: AuthTokenType.PASSWORD_RESET,
        }),
        expect.objectContaining({ usedAt: expect.any(Date) as Date }),
      );
      expect(manager.save).toHaveBeenCalled();
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        AppEvent.PASSWORD_RESET_REQUESTED,
        expect.objectContaining({
          email: mockUser.email,
          resetOtp: expect.stringMatching(/^\d{6}$/) as string,
        }),
      );
      expect(result.message).toEqual('messages.AUTH.FORGOT_PASSWORD_SUCCESS');
    });

    function mockDataSourceTransactionCalls(): number {
      return (
        (manager.update.mock.calls.length as number) +
        (manager.save.mock.calls.length as number)
      );
    }
  });

  describe('resetPassword', () => {
    const dto = {
      email: 'test@mail.com',
      otp: '123456',
      newPassword: 'newPass123',
    };
    const mockUser = { id: '1', email: dto.email, username: 'test' };

    it('should reset the password and emit PasswordChanged', async () => {
      userRepository.findOne.mockResolvedValue(mockUser);
      authTokenRepository.findOne.mockResolvedValue({
        id: 'tok-1',
        userId: mockUser.id,
        tokenHash: hashOtp(mockUser.id, dto.otp),
        type: AuthTokenType.PASSWORD_RESET,
        expiresAt: new Date(Date.now() + 60_000),
        usedAt: null,
      });
      (bcrypt.hash as jest.Mock).mockResolvedValue('newHashedPass');

      const result = await service.resetPassword(dto);

      expect(bcrypt.hash).toHaveBeenCalledWith(
        dto.newPassword,
        BCRYPT_SALT_ROUNDS,
      );
      expect(manager.update).toHaveBeenCalledWith(User, mockUser.id, {
        password: 'newHashedPass',
      });
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        AppEvent.PASSWORD_CHANGED,
        expect.objectContaining({ email: mockUser.email }),
      );
      expect(result.message).toEqual('messages.AUTH.RESET_PASSWORD_SUCCESS');
    });

    it('should throw BadRequestException if email does not exist', async () => {
      userRepository.findOne.mockResolvedValue(null);

      await expect(service.resetPassword(dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if OTP is invalid', async () => {
      userRepository.findOne.mockResolvedValue(mockUser);
      authTokenRepository.findOne.mockResolvedValue(null);

      await expect(service.resetPassword(dto)).rejects.toThrow(
        BadRequestException,
      );
      expect(eventEmitter.emit).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    const loginDto = { email: 'test@mail.com', password: 'pass' } as any;

    it('should login successfully', async () => {
      const mockUser = {
        id: '1',
        email: 'test@mail.com',
        password: 'hashedPass',
        role: UserRole.USER,
        status: UserStatus.ACTIVE,
      };
      userRepository.findOne.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      jwtService.sign.mockReturnValue('accessToken');

      const result = await service.login(loginDto);

      expect(jwtService.sign).toHaveBeenCalledWith({
        sub: '1',
        email: 'test@mail.com',
        role: UserRole.USER,
      });
      expect(result.accessToken).toEqual('accessToken');
    });

    it('should throw Unauthorized if email not found', async () => {
      userRepository.findOne.mockResolvedValue(null);
      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw Forbidden if inactive', async () => {
      userRepository.findOne.mockResolvedValue({ status: UserStatus.INACTIVE });
      await expect(service.login(loginDto)).rejects.toThrow(ForbiddenException);
    });

    it('should throw Unauthorized if wrong password', async () => {
      userRepository.findOne.mockResolvedValue({
        status: UserStatus.ACTIVE,
        password: 'hashedPass',
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);
      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});
