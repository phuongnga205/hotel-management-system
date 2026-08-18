import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { TokenUtil } from '../../token/token.util';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { I18nService } from 'nestjs-i18n';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    private configService: ConfigService,
    private tokenUtil: TokenUtil,
    private i18n: I18nService,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_SECRET'),
      passReqToCallback: true,
    });
  }

  async validate(
    req: Request,
    payload: { sub: string; email: string; role: string },
  ) {
    const rawToken = ExtractJwt.fromAuthHeaderAsBearerToken()(req);

    // Kiểm tra xem Token có bị ghim vào Redis Blacklist chưa
    if (rawToken) {
      const isBlacklisted = await this.tokenUtil.isRevoked(rawToken);
      if (isBlacklisted) {
        throw new UnauthorizedException(
          this.i18n.t('messages.AUTH.TOKEN_BLACKLISTED'),
        );
      }
    }

    const user = await this.userRepository.findOne({
      where: { id: payload.sub },
    });
    if (!user) {
      throw new UnauthorizedException(
        this.i18n.t('messages.AUTH.UNAUTHORIZED'),
      );
    }

    return user;
  }
}
