import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';
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
        // Determine synchronize behaviour from env or test mode. Default: enabled for tests, disabled otherwise.
        const syncEnv = configService.get<string | undefined>(
          'TYPEORM_SYNCHRONIZE',
        );
        const synchronize =
          syncEnv !== undefined
            ? syncEnv === 'true'
            : process.env.NODE_ENV === 'test';

        const common = {
          autoLoadEntities: true,
          synchronize,
          logging: false,
        };

        let options: TypeOrmModuleOptions;

        if (process.env.NODE_ENV === 'test') {
          options = {
            type: 'better-sqlite3',
            database: ':memory:',
            ...common,
          } as unknown as TypeOrmModuleOptions;
        } else {
          // Determine SSL certificate validation behavior.
          // - Honor explicit `DATABASE_SSL_REJECT_UNAUTHORIZED` when provided.
          // - If not set, try to auto-detect Neon (neon.tech) and disable strict validation by default.
          const dbUrl = configService.get<string>('DATABASE_URL');
          const rawSsl = configService.get<string | boolean | undefined>(
            'DATABASE_SSL_REJECT_UNAUTHORIZED',
          );

          let sslReject: boolean;
          if (rawSsl === undefined) {
            sslReject = dbUrl ? dbUrl.includes('neon.tech') === false : true;
          } else {
            sslReject = rawSsl === true || rawSsl === 'true';
          }

          options = {
            type: 'postgres',
            url: dbUrl,
            ssl: {
              rejectUnauthorized: Boolean(sslReject),
            },
            ...common,
          } as unknown as TypeOrmModuleOptions;
        }

        return options;
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
