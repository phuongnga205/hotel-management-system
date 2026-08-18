import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, IsNull, Repository } from 'typeorm';
import { instanceToPlain } from 'class-transformer';
import { User, UserStatus } from '../users/entities/user.entity';
import { JwtService } from '@nestjs/jwt';
import { I18nService } from 'nestjs-i18n';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ActivateAccountDto } from './dto/activate-account.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { AuthToken, AuthTokenType } from './entities/auth-token.entity';
import {
  ACTIVATION_OTP_TTL_MS,
  OTP_LENGTH,
  OTP_MAX_EXCLUSIVE,
  PASSWORD_RESET_OTP_TTL_MS,
} from './auth.constants';
import { AppEvent } from '../common/events/event-names.constants';
import { UserRegisteredEvent } from '../common/events/user-registered.event';
import { PasswordResetRequestedEvent } from '../common/events/password-reset-requested.event';
import { PasswordChangedEvent } from '../common/events/password-changed.event';

import { TokenUtil } from '../token/token.util';

export const BCRYPT_SALT_ROUNDS = 10;
export const POSTGRES_UNIQUE_VIOLATION_CODE = '23505';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(AuthToken)
    private authTokenRepository: Repository<AuthToken>,
    private readonly jwtService: JwtService,
    private readonly i18n: I18nService,
    private readonly tokenUtil: TokenUtil,
    private readonly dataSource: DataSource,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // Sinh mã OTP số ngẫu nhiên (crypto.randomInt — an toàn hơn Math.random),
  // luôn đủ OTP_LENGTH chữ số (đệm 0 phía trước).
  private generateOtp(): string {
    return crypto
      .randomInt(OTP_MAX_EXCLUSIVE)
      .toString()
      .padStart(OTP_LENGTH, '0');
  }

  // OTP có không gian giá trị nhỏ (chỉ 10^OTP_LENGTH khả năng) nên KHÔNG thể
  // hash trực tiếp rồi lưu vào cột token_hash (unique) như token ngẫu nhiên
  // trước đây — 2 user khác nhau hoàn toàn có thể trùng OTP và đụng unique
  // constraint. Hash theo cặp (userId, OTP) để hash luôn duy nhất per-user
  // dù trùng OTP với người khác.
  private hashOtp(userId: string, otp: string): string {
    return crypto.createHash('sha256').update(`${userId}:${otp}`).digest('hex');
  }

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
    const activationOtp = this.generateOtp();

    const user = this.userRepository.create({
      email,
      password: hashedPassword,
      username,
      phone,
    });

    // Tạo user + OTP kích hoạt là 2 thao tác ghi liên quan nhau — bọc
    // transaction để không bao giờ có user không có OTP kích hoạt đi kèm.
    // Hash OTP theo user.id nên phải tính sau khi save() (id chỉ có sau insert).
    try {
      await this.dataSource.transaction(async (manager) => {
        await manager.save(user);
        await manager.save(
          manager.create(AuthToken, {
            userId: user.id,
            type: AuthTokenType.EMAIL_VERIFICATION,
            tokenHash: this.hashOtp(user.id, activationOtp),
            expiresAt: new Date(Date.now() + ACTIVATION_OTP_TTL_MS),
          }),
        );
      });
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

    this.eventEmitter.emit(
      AppEvent.USER_REGISTERED,
      new UserRegisteredEvent(
        user.id,
        user.email,
        user.username,
        activationOtp,
      ),
    );

    return {
      message: this.i18n.t('messages.AUTH.REGISTER_SUCCESS'),
      // Never hand the raw entity to a controller — instanceToPlain() strips
      // every @Exclude()-marked field (password) regardless of whether the
      // caller remembers to have ClassSerializerInterceptor wired up.
      user: instanceToPlain(user),
    };
  }

  async activate(dto: ActivateAccountDto) {
    const user = await this.userRepository.findOne({
      where: { email: dto.email },
    });

    // Không phân biệt "email không tồn tại" với "OTP sai" trong message trả
    // về — tránh lộ thông tin tài khoản nào tồn tại trong hệ thống.
    if (!user) {
      throw new BadRequestException(
        this.i18n.t('messages.AUTH.ACTIVATE_TOKEN_INVALID'),
      );
    }

    const tokenHash = this.hashOtp(user.id, dto.otp);
    const authToken = await this.authTokenRepository.findOne({
      where: {
        tokenHash,
        type: AuthTokenType.EMAIL_VERIFICATION,
        usedAt: IsNull(),
      },
    });

    if (!authToken || authToken.expiresAt.getTime() < Date.now()) {
      throw new BadRequestException(
        this.i18n.t('messages.AUTH.ACTIVATE_TOKEN_INVALID'),
      );
    }

    // 2 thao tác ghi (kích hoạt user + đánh dấu token đã dùng) phải cùng
    // thành công hoặc cùng rollback, tránh trường hợp token bị đánh dấu
    // "đã dùng" nhưng user lại chưa được kích hoạt (hoặc ngược lại).
    await this.dataSource.transaction(async (manager) => {
      await manager.update(User, authToken.userId, {
        status: UserStatus.ACTIVE,
      });
      await manager.update(AuthToken, authToken.id, { usedAt: new Date() });
    });

    return {
      message: this.i18n.t('messages.AUTH.ACTIVATE_SUCCESS'),
    };
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.userRepository.findOne({
      where: { email: dto.email },
    });

    // Luôn trả cùng 1 message dù email có tồn tại hay không, tránh lộ thông
    // tin tài khoản nào đang tồn tại trong hệ thống (theo backend/docs/DANH_SACH_API.md mục 12).
    if (user) {
      const resetOtp = this.generateOtp();

      // Vô hiệu hoá mọi OTP reset cũ chưa dùng + tạo OTP mới — 2 thao
      // tác ghi nên bọc transaction.
      await this.dataSource.transaction(async (manager) => {
        await manager.update(
          AuthToken,
          {
            userId: user.id,
            type: AuthTokenType.PASSWORD_RESET,
            usedAt: IsNull(),
          },
          { usedAt: new Date() },
        );
        await manager.save(
          manager.create(AuthToken, {
            userId: user.id,
            type: AuthTokenType.PASSWORD_RESET,
            tokenHash: this.hashOtp(user.id, resetOtp),
            expiresAt: new Date(Date.now() + PASSWORD_RESET_OTP_TTL_MS),
          }),
        );
      });

      this.eventEmitter.emit(
        AppEvent.PASSWORD_RESET_REQUESTED,
        new PasswordResetRequestedEvent(
          user.id,
          user.email,
          user.username,
          resetOtp,
        ),
      );
    }

    return {
      message: this.i18n.t('messages.AUTH.FORGOT_PASSWORD_SUCCESS'),
    };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const user = await this.userRepository.findOne({
      where: { email: dto.email },
    });

    // Không phân biệt "email không tồn tại" với "OTP sai" trong message trả
    // về — cùng 1 lý do như activate().
    if (!user) {
      throw new BadRequestException(
        this.i18n.t('messages.AUTH.RESET_TOKEN_INVALID'),
      );
    }

    const tokenHash = this.hashOtp(user.id, dto.otp);
    const authToken = await this.authTokenRepository.findOne({
      where: {
        tokenHash,
        type: AuthTokenType.PASSWORD_RESET,
        usedAt: IsNull(),
      },
    });

    if (!authToken || authToken.expiresAt.getTime() < Date.now()) {
      throw new BadRequestException(
        this.i18n.t('messages.AUTH.RESET_TOKEN_INVALID'),
      );
    }

    const hashedPassword = await bcrypt.hash(
      dto.newPassword,
      BCRYPT_SALT_ROUNDS,
    );

    // Đổi mật khẩu + đánh dấu OTP đã dùng — 2 thao tác ghi, bọc transaction.
    await this.dataSource.transaction(async (manager) => {
      await manager.update(User, user.id, {
        password: hashedPassword,
      });
      await manager.update(AuthToken, authToken.id, { usedAt: new Date() });
    });

    this.eventEmitter.emit(
      AppEvent.PASSWORD_CHANGED,
      new PasswordChangedEvent(user.id, user.email, user.username),
    );

    return {
      message: this.i18n.t('messages.AUTH.RESET_PASSWORD_SUCCESS'),
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
    const accessToken = this.jwtService.sign(payload);

    return {
      message: this.i18n.t('messages.AUTH.LOGIN_SUCCESS'),
      accessToken,
      user: instanceToPlain(user),
    };
  }
}
