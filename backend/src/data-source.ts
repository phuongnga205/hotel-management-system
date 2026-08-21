import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import { ConfigService } from '@nestjs/config';
import { ENVIRONMENT_KEYS } from './config/environment.constants';

dotenv.config();

const configService = new ConfigService();
const rawSsl = configService.get<string>(
  ENVIRONMENT_KEYS.DATABASE_SSL_REJECT_UNAUTHORIZED,
  'true',
);

const AppDataSource = new DataSource({
  type: 'postgres',
  url: configService.getOrThrow<string>(ENVIRONMENT_KEYS.DATABASE_URL),
  ssl: { rejectUnauthorized: rawSsl === 'true' },
  synchronize: false,
  logging: false,
  entities: [__dirname + '/**/*.entity{.ts,.js}'],
  migrations: [__dirname + '/migrations/*{.ts,.js}'],
  migrationsTransactionMode: 'each',
});

export default AppDataSource;
