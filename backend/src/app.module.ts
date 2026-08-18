import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { ThrottlerModule } from '@nestjs/throttler';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { TokenModule } from './token/token.module';
import { RoomsModule } from './rooms/rooms.module';
import { BookingsModule } from './bookings/bookings.module';
import { ReviewsModule } from './reviews/reviews.module';
import { AmenitiesModule } from './amenities/amenities.module';
import { ImagesModule } from './images/images.module';
import { PaymentsModule } from './payments/payments.module';
import { MailModule } from './mail/mail.module';
import {
  I18nModule,
  AcceptLanguageResolver,
  HeaderResolver,
  QueryResolver,
} from 'nestjs-i18n';
import * as path from 'path';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ENVIRONMENT_KEYS } from './config/environment.constants';

const DEFAULT_REDIS_PORT = 6379;

const DEFAULT_THROTTLE_TTL = 60000;
const DEFAULT_THROTTLE_LIMIT = 10;

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    ThrottlerModule.forRoot([
      {
        ttl: DEFAULT_THROTTLE_TTL,
        limit: DEFAULT_THROTTLE_LIMIT,
      },
    ]),

    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const rawSsl = configService.get<string | boolean>(
          ENVIRONMENT_KEYS.DATABASE_SSL_REJECT_UNAUTHORIZED,
          'true',
        );

        return {
          type: 'postgres' as const,
          url: configService.getOrThrow<string>(ENVIRONMENT_KEYS.DATABASE_URL),
          ssl: {
            rejectUnauthorized: rawSsl === true || rawSsl === 'true',
          },
          autoLoadEntities: true,
          synchronize:
            configService.get<string>(
              ENVIRONMENT_KEYS.TYPEORM_SYNCHRONIZE,
              'false',
            ) === 'true',
          logging: false,
        };
      },
    }),

    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        connection: {
          host: configService.get<string>('REDIS_HOST', 'localhost'),
          port: configService.get<number>('REDIS_PORT', DEFAULT_REDIS_PORT),
        },
      }),
    }),

    I18nModule.forRoot({
      fallbackLanguage: 'vi',
      loaderOptions: {
        path: path.join(__dirname, '/i18n/'),
        watch: true,
      },
      resolvers: [
        { use: QueryResolver, options: ['lang'] },
        AcceptLanguageResolver,
        new HeaderResolver(['x-lang']),
      ],
    }),

    AuthModule,
    UsersModule,
    RoomsModule,
    BookingsModule,

    PaymentsModule,

    ReviewsModule,
    AmenitiesModule,
    ImagesModule,
    TokenModule,

    MailModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
