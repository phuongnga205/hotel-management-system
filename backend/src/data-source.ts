import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';

dotenv.config();

const isTest = process.env.NODE_ENV === 'test';
const databaseUrl = process.env.DATABASE_URL;

const common = {
  synchronize: false,
  logging: false,
  entities: [__dirname + '/**/*.entity{.ts,.js}'],
};

let dataSourceOptions: any;

if (isTest) {
  dataSourceOptions = {
    type: 'better-sqlite3',
    database: ':memory:',
    ...common,
    migrations: [__dirname + '/migrations/*{.ts,.js}'],
  };
} else {
  const rawSsl = process.env.DATABASE_SSL_REJECT_UNAUTHORIZED;
  let isSslReject = true;
  if (rawSsl === undefined) {
    isSslReject = databaseUrl ? !databaseUrl.includes('neon.tech') : true;
  } else {
    isSslReject = rawSsl === 'true' || rawSsl === '1';
  }

  dataSourceOptions = {
    type: 'postgres',
    url: databaseUrl,
    ssl: { rejectUnauthorized: Boolean(isSslReject) },
    ...common,
    migrations: [__dirname + '/migrations/*{.ts,.js}'],
  };
}

const AppDataSource = new DataSource(dataSourceOptions);

export default AppDataSource;
