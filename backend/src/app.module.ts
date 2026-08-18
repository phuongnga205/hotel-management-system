import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { RoomsModule } from './rooms/rooms.module';
import { BookingsModule } from './bookings/bookings.module';
import { ReviewsModule } from './reviews/reviews.module';
import { PaymentsModule } from './payments/payments.module';
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

@Module({
  imports: [
    // 1. Cấu hình ConfigModule toàn cục đọc tệp .env
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // 2. Tích hợp TypeORM kết nối Neon PostgreSQL (Async Config)
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

    // 3. Cấu hình BullModule kết nối Redis cho Message Queue
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

    // 4. Cấu hình đa ngôn ngữ (i18n)
    I18nModule.forRoot({
      fallbackLanguage: 'vi', // Ngôn ngữ mặc định là Tiếng Việt
      loaderOptions: {
        path: path.join(__dirname, '/i18n/'),
        watch: true, // Tự động cập nhật khi sửa file json
      },
      resolvers: [
        { use: QueryResolver, options: ['lang'] }, // Lấy ngôn ngữ từ url (vd: ?lang=en)
        AcceptLanguageResolver, // Lấy từ Header Accept-Language của Browser
        new HeaderResolver(['x-lang']), // Lấy từ Custom Header
      ],
    }),

    AuthModule,
    UsersModule,
    RoomsModule,
    BookingsModule,

    PaymentsModule,

    ReviewsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
