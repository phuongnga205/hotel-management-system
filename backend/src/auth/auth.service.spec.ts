/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unused-vars */
import { Test, TestingModule } from '@nestjs/testing';
import { AuthService, BCRYPT_SALT_ROUNDS } from './auth.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User, UserStatus, UserRole } from '../users/entities/user.entity';
import { JwtService } from '@nestjs/jwt';
import { I18nService } from 'nestjs-i18n';
import { TokenUtil } from '../token/token.util';
import * as bcrypt from 'bcrypt';
import { UnauthorizedException, ConflictException } from '@nestjs/common';

jest.mock('bcrypt');

describe('AuthService', () => {
  let service: AuthService;
  let userRepository: any;
  let jwtService: any;
  let i18nService: any;
  let tokenUtil: any;

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

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getRepositoryToken(User), useValue: mockUserRepository },
        { provide: JwtService, useValue: mockJwtService },
        { provide: I18nService, useValue: mockI18nService },
        { provide: TokenUtil, useValue: mockTokenUtil },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    userRepository = module.get(getRepositoryToken(User));
    jwtService = module.get(JwtService);
    i18nService = module.get(I18nService);
    tokenUtil = module.get(TokenUtil);
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
      userRepository.save.mockResolvedValue(true);

      const result = await service.register(registerDto);

      expect(bcrypt.hash).toHaveBeenCalledWith('pass', BCRYPT_SALT_ROUNDS);
      expect(userRepository.save).toHaveBeenCalled();
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

    it('should throw Unauthorized if inactive', async () => {
      userRepository.findOne.mockResolvedValue({ status: UserStatus.INACTIVE });
      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
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
