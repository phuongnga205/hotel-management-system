import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { RoomsModule } from './rooms/rooms.module';
import { BookingsModule } from './bookings/bookings.module';
import { ReviewsModule } from './reviews/reviews.module';
import { I18nModule, AcceptLanguageResolver, HeaderResolver, QueryResolver } from 'nestjs-i18n';
import { AmenitiesModule } from './amenities/amenities.module';
import { ImagesModule } from './images/images.module';
import * as path from 'path';

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
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        url: configService.get<string>('DATABASE_URL'),
        ssl: {
          rejectUnauthorized: false, // Bắt buộc cho Neon DB Serverless SSL
        },
        autoLoadEntities: true,    // Tự động nạp các Entity được khai báo ở các Module
        synchronize: false,         // Tự động đồng bộ Schema DB (dùng cho môi trường Dev)
        logging: false,            // Bật true nếu muốn in ra các câu lệnh SQL trong console
      }),
    }),

    // 3. Cấu hình BullModule kết nối Redis cho Message Queue
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        connection: {
          host: configService.get<string>('REDIS_HOST', 'localhost'),
          port: configService.get<number>('REDIS_PORT', 6379),
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
    ReviewsModule,
    AmenitiesModule,
    ImagesModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule { }