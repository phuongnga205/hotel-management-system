import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserStatus } from '../users/entities/user.entity';
import { JwtService } from '@nestjs/jwt';
import { I18nService } from 'nestjs-i18n';
import * as bcrypt from 'bcrypt';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

import { TokenUtil } from '../token/token.util';

export const BCRYPT_SALT_ROUNDS = 10;

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private readonly jwtService: JwtService,
    private readonly i18n: I18nService,
    private readonly tokenUtil: TokenUtil,
  ) {}

  async logout(token: string) {
    if (token) {
      const decoded: unknown = this.jwtService.decode(token);
      if (decoded && typeof decoded === 'object' && 'exp' in decoded) {
        const currentTime = Math.floor(Date.now() / 1000);
        const exp = (decoded as { exp: number }).exp;
        const ttlSeconds = exp - currentTime;
        await this.tokenUtil.revokeAuthToken(token, Math.floor(ttlSeconds));
      }
    }

    return {
      message: this.i18n.t('messages.AUTH.LOGOUT_SUCCESS'),
    };
  }

  async register(registerDto: RegisterDto) {
    const { email, password, username, phone } = registerDto;

    const hashedPassword = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);

    const user = this.userRepository.create({
      email,
      password: hashedPassword,
      username,
      phone,
    });

    try {
      await this.userRepository.save(user);
    } catch (error: unknown) {
      if (
        error &&
        typeof error === 'object' &&
        'code' in error &&
        error.code === '23505'
      ) {
        throw new ConflictException(
          this.i18n.t('messages.AUTH.USER_ALREADY_EXISTS'),
        );
      }
      throw error;
    }

    return {
      message: this.i18n.t('messages.AUTH.REGISTER_SUCCESS'),
      user,
    };
  }

  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;

    const user = await this.userRepository.findOne({ where: { email } });
    if (!user) {
      throw new UnauthorizedException(
        this.i18n.t('messages.AUTH.INVALID_CREDENTIALS'),
      );
    }

    if (user.status === UserStatus.INACTIVE) {
      throw new UnauthorizedException(
        this.i18n.t('messages.AUTH.USER_INACTIVE'),
      );
    }

    const isPasswordValid = await bcrypt.compare(password, user.password || '');
    if (!isPasswordValid) {
      throw new UnauthorizedException(
        this.i18n.t('messages.AUTH.INVALID_CREDENTIALS'),
      );
    }

    const payload = { sub: user.id, email: user.email, role: user.role };
    const accessToken = this.jwtService.sign(payload);

    return {
      message: this.i18n.t('messages.AUTH.LOGIN_SUCCESS'),
      accessToken,
      user,
    };
  }
}
