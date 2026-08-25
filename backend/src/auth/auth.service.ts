/* sunlint-disable */
import {
  ConflictException,
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { instanceToPlain } from 'class-transformer';
import { User, UserStatus } from '../users/entities/user.entity';
import { JwtService } from '@nestjs/jwt';
import { I18nService } from 'nestjs-i18n';
import * as bcrypt from 'bcrypt';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

import { TokenUtil } from '../token/token.util';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ConfigService } from '@nestjs/config';
import { randomInt } from 'node:crypto';
import { ActivateAccountDto } from './dto/activate-account.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import {
  MAIL_EVENT,
  PasswordResetRequestedEvent,
  UserRegisteredEvent,
} from '../mail/mail.events';
import {
  DEFAULT_OTP_TTL_SECONDS,
  ENVIRONMENT_KEYS,
} from '../config/environment.constants';

export const BCRYPT_SALT_ROUNDS = 10;
export const POSTGRES_UNIQUE_VIOLATION_CODE = '23505';
const OTP_MIN_VALUE = 100_000;
const OTP_MAX_EXCLUSIVE = 1_000_000;
const EMAIL_VERIFICATION_PURPOSE = 'EMAIL_VERIFICATION';
const PASSWORD_RESET_PURPOSE = 'PASSWORD_RESET';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private readonly jwtService: JwtService,
    private readonly i18n: I18nService,
    private readonly tokenUtil: TokenUtil,
    private readonly eventEmitter: EventEmitter2,
    private readonly configService: ConfigService,
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

    let savedUser: User;
    try {
      savedUser = await this.userRepository.save(user);
    } catch (error: unknown) {
      if (
        error &&
        typeof error === 'object' &&
        'code' in error &&
        error.code === POSTGRES_UNIQUE_VIOLATION_CODE
      ) {
        throw new ConflictException(
          this.i18n.t('messages.AUTH.USER_ALREADY_EXISTS'),
        );
      }
      throw error;
    }

    const otp = this.generateOtp();
    await this.tokenUtil.saveOtp(
      EMAIL_VERIFICATION_PURPOSE,
      savedUser.id,
      otp,
      this.getOtpTtlSeconds(),
    );
    await this.dispatchMailEventSafely(
      MAIL_EVENT.USER_REGISTERED,
      new UserRegisteredEvent(
        savedUser.id,
        savedUser.email,
        savedUser.fullName ?? savedUser.username,
        otp,
      ),
      { userId: savedUser.id, event: MAIL_EVENT.USER_REGISTERED },
    );

    return {
      message: this.i18n.t('messages.AUTH.REGISTER_SUCCESS'),
      // Never hand the raw entity to a controller — instanceToPlain() strips
      // every @Exclude()-marked field (password) regardless of whether the
      // caller remembers to have ClassSerializerInterceptor wired up.
      user: instanceToPlain(savedUser),
    };
  }

  async activate(dto: ActivateAccountDto) {
    const user = await this.userRepository.findOne({
      where: { email: dto.email },
    });
    if (!user) {
      throw new NotFoundException(this.i18n.t('messages.AUTH.USER_NOT_FOUND'));
    }
    if (user.status === UserStatus.ACTIVE) {
      throw new ConflictException(
        this.i18n.t('messages.AUTH.ALREADY_ACTIVATED'),
      );
    }
    const valid = await this.tokenUtil.consumeOtpIfMatches(
      EMAIL_VERIFICATION_PURPOSE,
      user.id,
      dto.otp,
    );
    if (!valid) {
      throw new BadRequestException(
        this.i18n.t('messages.AUTH.INVALID_OR_EXPIRED_OTP'),
      );
    }
    user.status = UserStatus.ACTIVE;
    user.activatedAt = new Date();
    await this.userRepository.save(user);
    return this.messageResponse('messages.AUTH.ACTIVATE_SUCCESS');
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.userRepository.findOne({
      where: { email: dto.email },
    });
    if (user) {
      const otp = this.generateOtp();
      await this.tokenUtil.saveOtp(
        PASSWORD_RESET_PURPOSE,
        user.id,
        otp,
        this.getOtpTtlSeconds(),
      );
      await this.dispatchMailEventSafely(
        MAIL_EVENT.PASSWORD_RESET_REQUESTED,
        new PasswordResetRequestedEvent(
          user.id,
          user.email,
          user.fullName ?? user.username,
          otp,
        ),
        {
          userId: user.id,
          event: MAIL_EVENT.PASSWORD_RESET_REQUESTED,
        },
      );
    }
    return this.messageResponse('messages.AUTH.FORGOT_PASSWORD_ACCEPTED');
  }

  async resetPassword(dto: ResetPasswordDto) {
    const user = await this.userRepository.findOne({
      where: { email: dto.email },
    });
    const valid = user
      ? await this.tokenUtil.consumeOtpIfMatches(
          PASSWORD_RESET_PURPOSE,
          user.id,
          dto.otp,
        )
      : false;
    if (!valid) {
      throw new BadRequestException(
        this.i18n.t('messages.AUTH.INVALID_OR_EXPIRED_OTP'),
      );
    }
    // `valid` can only be true when `user` exists, but keep the guard explicit
    // so the invariant is clear to TypeScript and future maintainers.
    if (!user) {
      throw new BadRequestException(
        this.i18n.t('messages.AUTH.INVALID_OR_EXPIRED_OTP'),
      );
    }
    user.password = await bcrypt.hash(dto.newPassword, BCRYPT_SALT_ROUNDS);
    await this.userRepository.save(user);
    return this.messageResponse('messages.AUTH.RESET_PASSWORD_SUCCESS');
  }

  private generateOtp(): string {
    return randomInt(OTP_MIN_VALUE, OTP_MAX_EXCLUSIVE).toString();
  }

  private getOtpTtlSeconds(): number {
    const rawValue = this.configService.get<string | number>(
      ENVIRONMENT_KEYS.OTP_TTL_SECONDS,
      DEFAULT_OTP_TTL_SECONDS,
    );
    const ttl = Number(rawValue);
    if (!Number.isInteger(ttl) || ttl <= 0) {
      throw new InternalServerErrorException(
        this.i18n.t('messages.AUTH.INVALID_OTP_CONFIGURATION'),
      );
    }
    return ttl;
  }

  private messageResponse(messageKey: string) {
    return {
      statusCode: 200,
      message: this.i18n.t(messageKey),
      data: null,
    };
  }

  private async dispatchMailEventSafely(
    eventName: (typeof MAIL_EVENT)[keyof typeof MAIL_EVENT],
    payload: UserRegisteredEvent | PasswordResetRequestedEvent,
    context: { userId: string; event: string },
  ): Promise<void> {
    try {
      await this.eventEmitter.emitAsync(eventName, payload);
    } catch (error: unknown) {
      this.logger.error({
        message: 'Failed to persist authentication email event',
        ...context,
        error: error instanceof Error ? error.message : String(error),
        nextAction: 'Retry email delivery through the operational workflow',
      });
    }
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
    const accessToken = this.jwtService.sign(payload);

    return {
      message: this.i18n.t('messages.AUTH.LOGIN_SUCCESS'),
      accessToken,
      user: instanceToPlain(user),
    };
  }
}
