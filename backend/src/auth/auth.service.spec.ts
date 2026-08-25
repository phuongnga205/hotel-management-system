/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unused-vars */
import { Test, TestingModule } from '@nestjs/testing';
import { AuthService, BCRYPT_SALT_ROUNDS } from './auth.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User, UserStatus, UserRole } from '../users/entities/user.entity';
import { JwtService } from '@nestjs/jwt';
import { I18nService } from 'nestjs-i18n';
import { TokenUtil } from '../token/token.util';
import * as bcrypt from 'bcrypt';
import {
  UnauthorizedException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { TransactionalMailService } from '../mail/transactional-mail.service';

jest.mock('bcrypt');

describe('AuthService', () => {
  let service: AuthService;
  let userRepository: any;
  let jwtService: any;
  let i18nService: any;
  let tokenUtil: any;
  let mailService: any;

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
      saveOtp: jest.fn(),
      consumeOtpIfMatches: jest.fn(),
    };
    const mockConfigService = { get: jest.fn().mockReturnValue(600) };
    const mockMailService = {
      createAccountActivationOutbox: jest.fn().mockResolvedValue({}),
      createPasswordResetOutbox: jest.fn().mockResolvedValue({}),
    };
    const mockDataSource = {
      transaction: jest.fn((callback: (manager: any) => unknown) =>
        Promise.resolve(
          callback({
            create: (_entity: unknown, value: unknown) =>
              mockUserRepository.create(value),
            save: (_entity: unknown, value: unknown) =>
              mockUserRepository.save(value),
          }),
        ),
      ),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getRepositoryToken(User), useValue: mockUserRepository },
        { provide: JwtService, useValue: mockJwtService },
        { provide: I18nService, useValue: mockI18nService },
        { provide: TokenUtil, useValue: mockTokenUtil },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: DataSource, useValue: mockDataSource },
        { provide: TransactionalMailService, useValue: mockMailService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    userRepository = module.get(getRepositoryToken(User));
    jwtService = module.get(JwtService);
    i18nService = module.get(I18nService);
    tokenUtil = module.get(TokenUtil);
    mailService = module.get(TransactionalMailService);
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
      userRepository.save.mockImplementation((user: User) =>
        Promise.resolve({ id: '1', ...user }),
      );

      const result = await service.register(registerDto);

      expect(bcrypt.hash).toHaveBeenCalledWith('pass', BCRYPT_SALT_ROUNDS);
      expect(userRepository.save).toHaveBeenCalled();
      expect(tokenUtil.saveOtp).toHaveBeenCalledWith(
        'EMAIL_VERIFICATION',
        '1',
        expect.stringMatching(/^\d{6}$/),
        600,
      );
      expect(mailService.createAccountActivationOutbox).toHaveBeenCalled();
      expect(result.message).toEqual('messages.AUTH.REGISTER_SUCCESS');
    });

    it('should throw ConflictException on code 23505', async () => {
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedPass');
      userRepository.create.mockReturnValue({
        ...registerDto,
        password: 'hashedPass',
      });
      userRepository.save.mockRejectedValue({ code: '23505' });

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
      userRepository.save.mockRejectedValue(new Error('DB error'));

      await expect(service.register(registerDto)).rejects.toThrow('DB error');
    });
  });

  describe('email OTP flows', () => {
    const inactiveUser = {
      id: '1',
      email: 'test@mail.com',
      username: 'test',
      password: 'old-hash',
      status: UserStatus.INACTIVE,
    };

    it('activates an inactive account with a valid OTP and consumes it', async () => {
      userRepository.findOne.mockResolvedValue({ ...inactiveUser });
      tokenUtil.consumeOtpIfMatches.mockResolvedValue(true);
      userRepository.save.mockImplementation((user: User) =>
        Promise.resolve(user),
      );

      const result = await service.activate({
        email: inactiveUser.email,
        otp: '123456',
      });

      expect(userRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: UserStatus.ACTIVE }),
      );
      expect(tokenUtil.consumeOtpIfMatches).toHaveBeenCalledWith(
        'EMAIL_VERIFICATION',
        inactiveUser.id,
        '123456',
      );
      expect(result.statusCode).toBe(200);
    });

    it('rejects an invalid activation OTP', async () => {
      userRepository.findOne.mockResolvedValue({ ...inactiveUser });
      tokenUtil.consumeOtpIfMatches.mockResolvedValue(false);

      await expect(
        service.activate({ email: inactiveUser.email, otp: '000000' }),
      ).rejects.toThrow('messages.AUTH.INVALID_OR_EXPIRED_OTP');
      expect(userRepository.save).not.toHaveBeenCalled();
    });

    it('returns the same forgot-password response for an unknown email', async () => {
      userRepository.findOne.mockResolvedValue(null);

      const result = await service.forgotPassword({
        email: 'unknown@mail.com',
      });

      expect(result.message).toBe('messages.AUTH.FORGOT_PASSWORD_ACCEPTED');
      expect(tokenUtil.saveOtp).not.toHaveBeenCalled();
      expect(mailService.createPasswordResetOutbox).not.toHaveBeenCalled();
    });

    it('creates a password-reset OTP and persists its outbox', async () => {
      userRepository.findOne.mockResolvedValue({ ...inactiveUser });

      await service.forgotPassword({ email: inactiveUser.email });

      expect(tokenUtil.saveOtp).toHaveBeenCalledWith(
        'PASSWORD_RESET',
        inactiveUser.id,
        expect.stringMatching(/^\d{6}$/),
        600,
      );
      expect(mailService.createPasswordResetOutbox).toHaveBeenCalled();
    });

    it('resets the password with a valid OTP and consumes it', async () => {
      userRepository.findOne.mockResolvedValue({ ...inactiveUser });
      tokenUtil.consumeOtpIfMatches.mockResolvedValue(true);
      (bcrypt.hash as jest.Mock).mockResolvedValue('new-hash');
      userRepository.save.mockImplementation((user: User) =>
        Promise.resolve(user),
      );

      await service.resetPassword({
        email: inactiveUser.email,
        otp: '123456',
        newPassword: 'new-password',
      });

      expect(userRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ password: 'new-hash' }),
      );
      expect(tokenUtil.consumeOtpIfMatches).toHaveBeenCalledWith(
        'PASSWORD_RESET',
        inactiveUser.id,
        '123456',
      );
    });

    it('does not reveal whether a reset-password email exists', async () => {
      userRepository.findOne.mockResolvedValue(null);

      await expect(
        service.resetPassword({
          email: 'unknown@mail.com',
          otp: '123456',
          newPassword: 'new-password',
        }),
      ).rejects.toThrow('messages.AUTH.INVALID_OR_EXPIRED_OTP');
      expect(tokenUtil.consumeOtpIfMatches).not.toHaveBeenCalled();
    });

    it('rolls registration back when outbox persistence fails', async () => {
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedPass');
      userRepository.create.mockReturnValue({
        email: 'test@mail.com',
        password: 'hashedPass',
        username: 'test',
      });
      userRepository.save.mockResolvedValue({
        id: '1',
        email: 'test@mail.com',
        password: 'hashedPass',
        username: 'test',
      });
      mailService.createAccountActivationOutbox.mockRejectedValueOnce(
        new Error('outbox down'),
      );

      await expect(
        service.register({
          email: 'test@mail.com',
          password: 'pass',
          username: 'test',
        } as any),
      ).rejects.toThrow('outbox down');
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
