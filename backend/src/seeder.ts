import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { seeder } from 'nestjs-seeder';
import { I18nModule } from 'nestjs-i18n';
import * as path from 'node:path';
import { ENVIRONMENT_KEYS } from './config/environment.constants';
import { RoomsSeeder } from './seeders/rooms.seeder';

void seeder({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
    I18nModule.forRoot({
      fallbackLanguage: 'vi',
      loaderOptions: {
        path: path.join(__dirname, '/i18n/'),
        watch: false,
      },
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres' as const,
        url: configService.getOrThrow<string>(ENVIRONMENT_KEYS.DATABASE_URL),
        ssl: {
          rejectUnauthorized:
            configService.get<string>(
              ENVIRONMENT_KEYS.DATABASE_SSL_REJECT_UNAUTHORIZED,
              'true',
            ) === 'true',
        },
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        synchronize: false,
        logging: false,
      }),
    }),
  ],
}).run([RoomsSeeder]);
