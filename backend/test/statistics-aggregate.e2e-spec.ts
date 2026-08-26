import 'dotenv/config';
import * as path from 'path';
import { INestApplication } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';
import {
  AcceptLanguageResolver,
  HeaderResolver,
  I18nModule,
  I18nValidationExceptionFilter,
  I18nValidationPipe,
  QueryResolver,
} from 'nestjs-i18n';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'node:crypto';
import Redis from 'ioredis';
import request from 'supertest';
import { App } from 'supertest/types';
import { DataSource } from 'typeorm';
import { Workbook } from 'exceljs';
import { AuthModule } from '../src/auth/auth.module';
import { BCRYPT_SALT_ROUNDS } from '../src/auth/auth.service';
import { BookingStatus } from '../src/bookings/enums/booking-status.enum';
import {
  ENVIRONMENT_KEYS,
  parseNetworkPort,
} from '../src/config/environment.constants';
import { PaymentMethod } from '../src/payments/enums/payment-method.enum';
import { PaymentStatus } from '../src/payments/enums/payment-status.enum';
import { RoomStatus } from '../src/rooms/enums/room-status.enum';
import { StatisticsPeriod } from '../src/statistics/enums/statistics-period.enum';
import { StatisticsResponseDto } from '../src/statistics/dto/statistics-response.dto';
import { StatisticsModule } from '../src/statistics/statistics.module';
import { TokenModule } from '../src/token/token.module';
import { UserRole, UserStatus } from '../src/users/entities/user.entity';

const configService = new ConfigService();
const e2eDatabaseUrl = configService.get<string>(
  ENVIRONMENT_KEYS.E2E_DATABASE_URL,
);
const applicationDatabaseUrl = configService.get<string>(
  ENVIRONMENT_KEYS.DATABASE_URL,
);
const e2eSslEnabled = configService.get<string>(
  ENVIRONMENT_KEYS.E2E_DATABASE_SSL_ENABLED,
  'false',
);
const e2eSslRejectUnauthorized = configService.get<string>(
  ENVIRONMENT_KEYS.E2E_DATABASE_SSL_REJECT_UNAUTHORIZED,
  'true',
);
const redisHost = configService.get<string>(ENVIRONMENT_KEYS.REDIS_HOST);
const redisPortValue = configService.get<string>(ENVIRONMENT_KEYS.REDIS_PORT);
const TEST_ROOM_NUMBER_PREFIX = 'STAT-';
const TEST_ROOM_UUID_LENGTH = 12;
const TEST_ROOM_CAPACITY = 2;
const TEST_ROOM_PRICE = 100;
const TEST_PAYMENT_AMOUNT = 100;
const TEST_REFUNDED_AMOUNT = 40;
const TEST_PASSWORD = 'Statistics@123456';
const API_PREFIX = '/api/v1';

interface LoginResponseBody {
  accessToken: string;
}

function getDatabaseIdentity(connectionString: string): string {
  const url = new URL(connectionString);
  return [
    url.hostname.toLowerCase(),
    url.port || '5432',
    url.pathname.replace(/^\/+/, '').toLowerCase(),
  ].join(':');
}

function getDatabaseName(connectionString: string): string {
  return new URL(connectionString).pathname.replace(/^\/+/, '').toLowerCase();
}

describe('Statistics aggregate HTTP, SQL and Redis (e2e)', () => {
  let dataSource: DataSource;
  let app: INestApplication<App>;
  let redisClient: Redis;
  let userId: string | undefined;
  let adminUserId: string | undefined;
  let adminToken: string;
  let userToken: string;
  let roomId: string | undefined;
  const bookingIds: string[] = [];
  const paymentIds: string[] = [];

  beforeAll(async () => {
    if (!e2eDatabaseUrl) {
      throw new Error('E2E_DATABASE_URL is required for statistics E2E tests');
    }
    if (
      applicationDatabaseUrl &&
      getDatabaseIdentity(e2eDatabaseUrl) ===
        getDatabaseIdentity(applicationDatabaseUrl)
    ) {
      throw new Error(
        'E2E_DATABASE_URL must be isolated from DATABASE_URL to protect application data',
      );
    }
    if (!getDatabaseName(e2eDatabaseUrl).endsWith('_e2e')) {
      throw new Error(
        'E2E database name must end with _e2e to protect application data',
      );
    }
    if (!redisHost || !redisPortValue) {
      throw new Error(
        'REDIS_HOST and REDIS_PORT are required for statistics E2E tests',
      );
    }
    const redisPort = parseNetworkPort(
      redisPortValue,
      ENVIRONMENT_KEYS.REDIS_PORT,
    );

    dataSource = new DataSource({
      type: 'postgres',
      url: e2eDatabaseUrl,
      ssl:
        e2eSslEnabled === 'true'
          ? { rejectUnauthorized: e2eSslRejectUnauthorized === 'true' }
          : false,
      synchronize: false,
      entities: [__dirname + '/../src/**/*.entity{.ts,.js}'],
      migrations: [__dirname + '/../src/migrations/*{.ts,.js}'],
    });
    await dataSource.initialize();
    await dataSource.runMigrations();

    const moduleFixture = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env',
          load: [
            () => ({
              [ENVIRONMENT_KEYS.STATISTICS_CACHE_TTL_SECONDS]: 30,
              [ENVIRONMENT_KEYS.STATISTICS_TIME_ZONE]: 'UTC',
            }),
          ],
        }),
        ThrottlerModule.forRoot([{ ttl: 60_000, limit: 10 }]),
        I18nModule.forRoot({
          fallbackLanguage: 'vi',
          loaderOptions: {
            path: path.join(__dirname, '../src/i18n/'),
            watch: false,
          },
          resolvers: [
            { use: QueryResolver, options: ['lang'] },
            AcceptLanguageResolver,
            new HeaderResolver(['x-lang']),
          ],
        }),
        TypeOrmModule.forRoot({
          type: 'postgres',
          url: e2eDatabaseUrl,
          ssl:
            e2eSslEnabled === 'true'
              ? { rejectUnauthorized: e2eSslRejectUnauthorized === 'true' }
              : false,
          synchronize: false,
          entities: [__dirname + '/../src/**/*.entity{.ts,.js}'],
          logging: false,
        }),
        TokenModule,
        AuthModule,
        StatisticsModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalFilters(new I18nValidationExceptionFilter());
    app.useGlobalPipes(
      new I18nValidationPipe({ whitelist: true, transform: true }),
    );
    await app.init();
    redisClient = new Redis({ host: redisHost, port: redisPort });
    await redisClient.ping();

    await redisClient.del('statistics:revenue-bookings:v1:MONTH:2026:all:UTC');
    await redisClient.del('statistics:revenue-bookings:v1:YEAR:2026:all:UTC');

    const suffix = randomUUID();
    const identitySuffix = suffix.slice(0, TEST_ROOM_UUID_LENGTH);
    const roomNumber = `${TEST_ROOM_NUMBER_PREFIX}${suffix.slice(
      0,
      TEST_ROOM_UUID_LENGTH,
    )}`;
    const passwordHash = await bcrypt.hash(TEST_PASSWORD, BCRYPT_SALT_ROUNDS);
    const users = await dataSource.query<Array<{ id: string }>>(
      `INSERT INTO users (username, email, password_hash, status, role)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [
        `statistics-${identitySuffix}`,
        `statistics-${identitySuffix}@example.com`,
        passwordHash,
        UserStatus.ACTIVE,
        UserRole.USER,
      ],
    );
    userId = users[0].id;

    const adminUsers = await dataSource.query<Array<{ id: string }>>(
      `INSERT INTO users (username, email, password_hash, status, role)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [
        `statistics-admin-${identitySuffix}`,
        `statistics-admin-${identitySuffix}@example.com`,
        passwordHash,
        UserStatus.ACTIVE,
        UserRole.ADMIN,
      ],
    );
    adminUserId = adminUsers[0].id;
    const [userLogin, adminLogin] = await Promise.all([
      request(app.getHttpServer())
        .post(`${API_PREFIX}/auth/login`)
        .send({
          email: `statistics-${identitySuffix}@example.com`,
          password: TEST_PASSWORD,
        })
        .expect(200),
      request(app.getHttpServer())
        .post(`${API_PREFIX}/auth/login`)
        .send({
          email: `statistics-admin-${identitySuffix}@example.com`,
          password: TEST_PASSWORD,
        })
        .expect(200),
    ]);
    userToken = (userLogin.body as LoginResponseBody).accessToken;
    adminToken = (adminLogin.body as LoginResponseBody).accessToken;

    const rooms = await dataSource.query<Array<{ id: string }>>(
      `INSERT INTO rooms (room_number, name, capacity, price_per_night, status)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [
        roomNumber,
        `Statistics ${suffix}`,
        TEST_ROOM_CAPACITY,
        TEST_ROOM_PRICE,
        RoomStatus.ACTIVE,
      ],
    );
    roomId = rooms[0].id;

    for (const [index, status] of Object.values(BookingStatus).entries()) {
      const rows = await dataSource.query<Array<{ id: string }>>(
        `INSERT INTO bookings
          (user_id, room_id, check_in_date, check_out_date, price_per_night,
           total_price, status, created_at)
         VALUES ($1, $2, $3, $4, $5, $5, $6, $7) RETURNING id`,
        [
          userId,
          roomId,
          `2027-0${index + 1}-01`,
          `2027-0${index + 1}-02`,
          TEST_ROOM_PRICE,
          status,
          `2026-08-0${index + 1}T10:00:00Z`,
        ],
      );
      bookingIds.push(rows[0].id);
    }

    const successfulPayment = await dataSource.query<Array<{ id: string }>>(
      `INSERT INTO payments (booking_id, amount, method, status, paid_at)
       VALUES ($1, $2, $3, $4, '2026-08-05T10:00:00Z') RETURNING id`,
      [
        bookingIds[0],
        TEST_PAYMENT_AMOUNT,
        PaymentMethod.CASH,
        PaymentStatus.SUCCESS,
      ],
    );
    paymentIds.push(successfulPayment[0].id);

    const refundedPayment = await dataSource.query<Array<{ id: string }>>(
      `INSERT INTO payments (booking_id, amount, method, status, paid_at)
       VALUES ($1, $2, $3, $4, '2026-08-06T10:00:00Z') RETURNING id`,
      [
        bookingIds[1],
        TEST_REFUNDED_AMOUNT,
        PaymentMethod.CASH,
        PaymentStatus.REFUNDED,
      ],
    );
    paymentIds.push(refundedPayment[0].id);
  });

  it('enforces authentication and ADMIN authorization', async () => {
    const endpoint = '/api/v1/statistics/revenue-bookings';
    const query = { period: StatisticsPeriod.MONTH, year: 2026 };

    await request(app.getHttpServer()).get(endpoint).query(query).expect(401);
    await request(app.getHttpServer())
      .get(endpoint)
      .set('Authorization', `Bearer ${userToken}`)
      .query(query)
      .expect(403);
  });

  it('serves aggregate SQL over authenticated HTTP and reuses a real Redis cache with TTL', async () => {
    const endpoint = '/api/v1/statistics/revenue-bookings';
    const firstResponse = await request(app.getHttpServer())
      .get(endpoint)
      .set('Authorization', `Bearer ${adminToken}`)
      .query({ period: StatisticsPeriod.MONTH, year: 2026 })
      .expect(200);
    const firstBody = firstResponse.body as StatisticsResponseDto;

    expect(firstBody.totalRevenue).toBe('100.00');
    expect(firstBody.totalBookings).toBe(Object.values(BookingStatus).length);
    expect(firstBody.buckets[7]).toMatchObject({
      label: '2026-08',
      revenue: '100.00',
      bookingCount: Object.values(BookingStatus).length,
    });
    expect(firstBody.isCached).toBe(false);

    const cacheKey = 'statistics:revenue-bookings:v1:MONTH:2026:all:UTC';
    expect(await redisClient.ttl(cacheKey)).toBeGreaterThan(0);

    const secondResponse = await request(app.getHttpServer())
      .get(endpoint)
      .set('Authorization', `Bearer ${adminToken}`)
      .query({ period: StatisticsPeriod.MONTH, year: 2026 })
      .expect(200);
    const secondBody = secondResponse.body as StatisticsResponseDto;
    expect(secondBody.isCached).toBe(true);
  });

  it('exports a valid Excel workbook and enforces validation and ADMIN access', async () => {
    const endpoint = '/api/v1/statistics/revenue-bookings/export';
    const query = { period: StatisticsPeriod.YEAR, year: 2026 };

    await request(app.getHttpServer()).get(endpoint).query(query).expect(401);
    await request(app.getHttpServer())
      .get(endpoint)
      .set('Authorization', `Bearer ${userToken}`)
      .query(query)
      .expect(403);
    await request(app.getHttpServer())
      .get(endpoint)
      .set('Authorization', `Bearer ${adminToken}`)
      .query({ period: 'INVALID', year: 2026 })
      .expect(400);

    const response = await request(app.getHttpServer())
      .get(endpoint)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('Accept-Language', 'en')
      .query(query)
      .buffer(true)
      .parse((incoming, callback) => {
        const chunks: Buffer[] = [];
        incoming.on('data', (chunk: Buffer) => chunks.push(chunk));
        incoming.on('end', () => callback(null, Buffer.concat(chunks)));
      })
      .expect(200)
      .expect(
        'Content-Type',
        /application\/vnd\.openxmlformats-officedocument\.spreadsheetml\.sheet/,
      );
    const workbook = new Workbook();
    await workbook.xlsx.load(response.body as Buffer);

    expect(workbook.getWorksheet('Summary')).toBeDefined();
    expect(workbook.getWorksheet('Breakdown')?.getCell('A2').value).toBe(
      '2026',
    );
  });

  afterAll(async () => {
    if (redisClient) {
      await redisClient.del(
        'statistics:revenue-bookings:v1:MONTH:2026:all:UTC',
      );
      await redisClient.del('statistics:revenue-bookings:v1:YEAR:2026:all:UTC');
      redisClient.disconnect();
    }
    if (app) await app.close();
    if (!dataSource?.isInitialized) return;
    if (paymentIds.length > 0) {
      await dataSource.query('DELETE FROM payments WHERE id = ANY($1)', [
        paymentIds,
      ]);
    }
    if (bookingIds.length > 0) {
      await dataSource.query('DELETE FROM bookings WHERE id = ANY($1)', [
        bookingIds,
      ]);
    }
    if (roomId)
      await dataSource.query('DELETE FROM rooms WHERE id = $1', [roomId]);
    if (userId)
      await dataSource.query('DELETE FROM users WHERE id = $1', [userId]);
    if (adminUserId)
      await dataSource.query('DELETE FROM users WHERE id = $1', [adminUserId]);
    await dataSource.destroy();
  });
});
