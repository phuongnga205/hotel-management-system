/* sunlint-disable */
import {
  ConflictException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { instanceToPlain } from 'class-transformer';
import { User, UserStatus } from '../users/entities/user.entity';
import type { DeepPartial, FindOneOptions } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { I18nService } from 'nestjs-i18n';
import * as bcrypt from 'bcrypt';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

import { TokenUtil } from '../token/token.util';

export const BCRYPT_SALT_ROUNDS = 10;
export const POSTGRES_UNIQUE_VIOLATION_CODE = '23505';

interface UserStore {
  create(entityLike: DeepPartial<User>): User;
  save(entity: User): Promise<User>;
  findOne(options: FindOneOptions<User>): Promise<User | null>;
}

@Injectable()
export class AuthService {
  constructor(
    // sunlint-disable-next-line C033
    @InjectRepository(User)
    private userRepository: UserStore,
    private readonly jwtService: JwtService,
    private readonly i18n: I18nService,
    private readonly tokenUtil: TokenUtil,
  ) {}

  // sunlint-disable-next-line S041
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
        error.code === POSTGRES_UNIQUE_VIOLATION_CODE
      ) {
        // sunlint-disable-next-line C018
        throw new ConflictException(
          this.i18n.t('messages.AUTH.USER_ALREADY_EXISTS'),
        );
      }
      // sunlint-disable-next-line C018
      throw new InternalServerErrorException(
        this.i18n.t('messages.AUTH.REGISTRATION_FAILED'),
        { cause: error },
      );
    }

    return {
      message: this.i18n.t('messages.AUTH.REGISTER_SUCCESS'),
      // Never hand the raw entity to a controller — instanceToPlain() strips
      // every @Exclude()-marked field (password) regardless of whether the
      // caller remembers to have ClassSerializerInterceptor wired up.
      user: instanceToPlain(user),
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
      throw new ForbiddenException(this.i18n.t('messages.AUTH.USER_INACTIVE'));
    }

    const isPasswordValid = await bcrypt.compare(password, user.password || '');
    if (!isPasswordValid) {
      throw new UnauthorizedException(
        this.i18n.t('messages.AUTH.INVALID_CREDENTIALS'),
      );
    }

    const payload = { sub: user.id, email: user.email, role: user.role };
    const accessToken = this.jwtService.sign(payload, { expiresIn: '1h' });

    return {
      message: this.i18n.t('messages.AUTH.LOGIN_SUCCESS'),
      accessToken,
      user: instanceToPlain(user),
    };
  }
}
