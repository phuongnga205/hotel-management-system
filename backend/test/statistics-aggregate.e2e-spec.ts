import 'dotenv/config';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Test } from '@nestjs/testing';
import { randomUUID } from 'node:crypto';
import Redis from 'ioredis';
import request from 'supertest';
import { App } from 'supertest/types';
import { DataSource, EntitySchema } from 'typeorm';
import { I18nService } from 'nestjs-i18n';
import { JwtAuthGuard } from '../src/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../src/auth/guards/roles.guard';
import { Booking } from '../src/bookings/entities/booking.entity';
import { BookingStatus } from '../src/bookings/enums/booking-status.enum';
import {
  ENVIRONMENT_KEYS,
  parseNetworkPort,
} from '../src/config/environment.constants';
import { Payment } from '../src/payments/entities/payment.entity';
import { PaymentMethod } from '../src/payments/enums/payment-method.enum';
import { PaymentStatus } from '../src/payments/enums/payment-status.enum';
import { RoomStatus } from '../src/rooms/enums/room-status.enum';
import { StatisticsPeriod } from '../src/statistics/enums/statistics-period.enum';
import { StatisticsController } from '../src/statistics/statistics.controller';
import { StatisticsResponseDto } from '../src/statistics/dto/statistics-response.dto';
import { StatisticsLogger } from '../src/statistics/statistics.logger';
import { StatisticsService } from '../src/statistics/statistics.service';
import { RedisUtil } from '../src/token/redis.util';
import { UserRole, UserStatus } from '../src/users/entities/user.entity';

const BookingAggregateSchema = new EntitySchema<Booking>({
  name: 'BookingAggregate',
  target: Booking,
  tableName: 'bookings',
  columns: {
    id: { type: 'bigint', primary: true, generated: true },
    status: { type: 'varchar' },
    createdAt: { name: 'created_at', type: 'timestamptz' },
    deletedAt: {
      name: 'deleted_at',
      type: 'timestamptz',
      nullable: true,
      deleteDate: true,
    },
  },
});

const PaymentAggregateSchema = new EntitySchema<Payment>({
  name: 'PaymentAggregate',
  target: Payment,
  tableName: 'payments',
  columns: {
    id: { type: 'bigint', primary: true, generated: true },
    amount: { type: 'decimal', precision: 10, scale: 2 },
    status: { type: 'varchar' },
    paidAt: { name: 'paid_at', type: 'timestamptz', nullable: true },
    deletedAt: {
      name: 'deleted_at',
      type: 'timestamptz',
      nullable: true,
      deleteDate: true,
    },
  },
});

const configService = new ConfigService();
const e2eDatabaseUrl = configService.get<string>(
  ENVIRONMENT_KEYS.E2E_DATABASE_URL,
);
const applicationDatabaseUrl = configService.get<string>(
  ENVIRONMENT_KEYS.DATABASE_URL,
);
const e2eSslRejectUnauthorized = configService.get<string>(
  ENVIRONMENT_KEYS.E2E_DATABASE_SSL_REJECT_UNAUTHORIZED,
  'false',
);
const redisHost = configService.get<string>(ENVIRONMENT_KEYS.REDIS_HOST);
const redisPortValue = configService.get<string>(ENVIRONMENT_KEYS.REDIS_PORT);
const TEST_ROOM_NUMBER_PREFIX = 'STAT-';
const TEST_ROOM_UUID_LENGTH = 12;
const TEST_ROOM_CAPACITY = 2;
const TEST_ROOM_PRICE = 100;
const TEST_PAYMENT_AMOUNT = 100;
const TEST_REFUNDED_AMOUNT = 40;

describe('Statistics aggregate HTTP, SQL and Redis (e2e)', () => {
  let dataSource: DataSource;
  let app: INestApplication<App>;
  let redisClient: Redis;
  let userId: string | undefined;
  let roomId: string | undefined;
  const bookingIds: string[] = [];
  const paymentIds: string[] = [];

  beforeAll(async () => {
    if (!e2eDatabaseUrl) {
      throw new Error('E2E_DATABASE_URL is required for statistics E2E tests');
    }
    if (e2eDatabaseUrl === applicationDatabaseUrl) {
      throw new Error(
        'E2E_DATABASE_URL must be isolated from DATABASE_URL to protect application data',
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
        e2eSslRejectUnauthorized === 'true'
          ? { rejectUnauthorized: true }
          : false,
      synchronize: false,
      entities: [BookingAggregateSchema, PaymentAggregateSchema],
    });
    await dataSource.initialize();

    const testConfig = new ConfigService({
      [ENVIRONMENT_KEYS.REDIS_HOST]: redisHost,
      [ENVIRONMENT_KEYS.REDIS_PORT]: redisPort,
      [ENVIRONMENT_KEYS.STATISTICS_CACHE_TTL_SECONDS]: 30,
      [ENVIRONMENT_KEYS.STATISTICS_TIME_ZONE]: 'UTC',
    });
    const moduleFixture = await Test.createTestingModule({
      controllers: [StatisticsController],
      providers: [
        StatisticsService,
        RedisUtil,
        {
          provide: getRepositoryToken(Booking),
          useValue: dataSource.getRepository(Booking),
        },
        {
          provide: getRepositoryToken(Payment),
          useValue: dataSource.getRepository(Payment),
        },
        { provide: ConfigService, useValue: testConfig },
        {
          provide: I18nService,
          useValue: { t: (key: string) => key },
        },
        {
          provide: StatisticsLogger,
          useValue: { error: jest.fn(), warn: jest.fn() },
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.init();
    redisClient = new Redis({ host: redisHost, port: redisPort });
    await redisClient.ping();

    await redisClient.del('statistics:revenue-bookings:v1:MONTH:2026:all:UTC');

    const suffix = randomUUID();
    const roomNumber = `${TEST_ROOM_NUMBER_PREFIX}${suffix.slice(
      0,
      TEST_ROOM_UUID_LENGTH,
    )}`;
    const users = await dataSource.query<Array<{ id: string }>>(
      `INSERT INTO users (username, email, password_hash, status, role)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [
        `statistics-${suffix}`,
        `statistics-${suffix}@example.com`,
        suffix,
        UserStatus.ACTIVE,
        UserRole.USER,
      ],
    );
    userId = users[0].id;

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

  it('serves aggregate SQL over HTTP and reuses a real Redis cache with TTL', async () => {
    const endpoint = '/api/v1/statistics/revenue-bookings';
    const firstResponse = await request(app.getHttpServer())
      .get(endpoint)
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
      .query({ period: StatisticsPeriod.MONTH, year: 2026 })
      .expect(200);
    const secondBody = secondResponse.body as StatisticsResponseDto;
    expect(secondBody.isCached).toBe(true);
  });

  afterAll(async () => {
    if (redisClient) {
      await redisClient.del(
        'statistics:revenue-bookings:v1:MONTH:2026:all:UTC',
      );
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
    await dataSource.destroy();
  });
});
