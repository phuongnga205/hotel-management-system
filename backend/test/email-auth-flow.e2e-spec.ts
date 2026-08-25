/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bullmq';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import request from 'supertest';
import * as bcrypt from 'bcrypt';
import { AppModule } from '../src/app.module';
import { User, UserStatus } from '../src/users/entities/user.entity';
import { EmailLog, EmailType } from '../src/mail/entities/email-log.entity';
import { MAIL_QUEUE } from '../src/mail/mail.constants';
import { MailProcessor } from '../src/mail/mail.processor';
import { OutboxProcessor } from '../src/mail/outbox.processor';
import { RedisUtil } from '../src/token/redis.util';
import { NodeEnvironment } from '../src/config/environment.constants';
import { Booking } from '../src/bookings/entities/booking.entity';
import { BookingStatus } from '../src/bookings/enums/booking-status.enum';
import { BookingsService } from '../src/bookings/bookings.service';
import { Room } from '../src/rooms/entities/room.entity';
import { RoomStatus } from '../src/rooms/enums/room-status.enum';
import { Review } from '../src/reviews/entities/review.entity';
import { ReviewsService } from '../src/reviews/reviews.service';
import { Decimal } from 'decimal.js';

const E2E_ACK_VALUE = 'hotel-management-e2e-only';

function useSafeE2eDatabase(): string {
  if (process.env.NODE_ENV !== NodeEnvironment.TEST) {
    throw new Error('E2E requires NODE_ENV=test');
  }
  const rawUrl = process.env.E2E_DATABASE_URL;
  if (
    !rawUrl ||
    !new URL(rawUrl).pathname.replace(/^\/+/, '').endsWith('_e2e')
  ) {
    throw new Error('E2E_DATABASE_URL must target a database ending in _e2e');
  }
  if (process.env.E2E_DATABASE_DESTRUCTIVE_ACK !== E2E_ACK_VALUE) {
    throw new Error(
      `E2E_DATABASE_DESTRUCTIVE_ACK=${E2E_ACK_VALUE} is required`,
    );
  }
  if (process.env.DATABASE_URL === rawUrl) {
    throw new Error('E2E_DATABASE_URL must differ from DATABASE_URL');
  }
  process.env.DATABASE_URL = rawUrl;
  process.env.DATABASE_SSL_ENABLED = 'false';
  process.env.DATABASE_SSL_REJECT_UNAUTHORIZED = 'true';
  return rawUrl;
}

describe('Email authentication flows (e2e)', () => {
  let app: import('@nestjs/common').INestApplication;
  let migrationDataSource: DataSource | undefined;
  let userRepository: Repository<User>;
  let emailLogRepository: Repository<EmailLog>;
  let bookingRepository: Repository<Booking>;
  let roomRepository: Repository<Room>;
  let reviewRepository: Repository<Review>;
  let bookingsService: BookingsService;
  let reviewsService: ReviewsService;
  let redisUtil: RedisUtil;

  beforeAll(async () => {
    const databaseUrl = useSafeE2eDatabase();
    migrationDataSource = new DataSource({
      type: 'postgres',
      url: databaseUrl,
      ssl: false,
      entities: [__dirname + '/../src/**/*.entity{.ts,.js}'],
      migrations: [__dirname + '/../src/migrations/*{.ts,.js}'],
      migrationsTransactionMode: 'each',
    });
    await migrationDataSource.initialize();
    await migrationDataSource.dropDatabase();
    await migrationDataSource.runMigrations();
    await migrationDataSource.destroy();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true }), AppModule],
    })
      .overrideProvider(getQueueToken(MAIL_QUEUE))
      .useValue({ add: jest.fn().mockResolvedValue({ id: 'mail-job' }) })
      .overrideProvider(MailProcessor)
      .useValue({})
      .overrideProvider(OutboxProcessor)
      .useValue({})
      .compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.init();

    userRepository = moduleFixture.get(getRepositoryToken(User));
    emailLogRepository = moduleFixture.get(getRepositoryToken(EmailLog));
    bookingRepository = moduleFixture.get(getRepositoryToken(Booking));
    roomRepository = moduleFixture.get(getRepositoryToken(Room));
    reviewRepository = moduleFixture.get(getRepositoryToken(Review));
    bookingsService = moduleFixture.get(BookingsService);
    reviewsService = moduleFixture.get(ReviewsService);
    redisUtil = moduleFixture.get(RedisUtil);
  }, 30_000);

  afterAll(async () => {
    await app?.close();
    if (migrationDataSource) {
      if (!migrationDataSource.isInitialized) {
        await migrationDataSource.initialize();
      }
      await migrationDataSource.dropDatabase();
      await migrationDataSource.runMigrations();
      await migrationDataSource.destroy();
    }
  }, 30_000);

  it('registers, queues activation email, activates, requests reset and resets password', async () => {
    const suffix = Date.now();
    const email = `email-flow-${suffix}@example.com`;
    const password = 'password123';

    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email, password, username: `email-flow-${suffix}` })
      .expect(201);

    let user = await userRepository.findOneByOrFail({ email });
    expect(user.status).toBe(UserStatus.INACTIVE);
    expect(
      await emailLogRepository.countBy({
        recipient: email,
        type: EmailType.ACCOUNT_ACTIVATION,
      }),
    ).toBe(1);

    const unknownReset = await request(app.getHttpServer())
      .post('/api/v1/auth/reset-password')
      .send({
        email: `unknown-${suffix}@example.com`,
        otp: '000000',
        newPassword: 'new-password123',
      })
      .expect(400);
    const invalidExistingReset = await request(app.getHttpServer())
      .post('/api/v1/auth/reset-password')
      .send({ email, otp: '000000', newPassword: 'new-password123' })
      .expect(400);
    expect(invalidExistingReset.body).toEqual(unknownReset.body);

    const activationOtp = await redisUtil.findOne(
      `otp:EMAIL_VERIFICATION:${user.id}`,
    );
    expect(activationOtp).toMatch(/^\d{6}$/);

    await request(app.getHttpServer())
      .post('/api/v1/auth/activate')
      .send({ email, otp: activationOtp })
      .expect(200);

    user = await userRepository.findOneByOrFail({ email });
    expect(user.status).toBe(UserStatus.ACTIVE);
    expect(user.activatedAt).toBeInstanceOf(Date);
    expect(
      await redisUtil.findOne(`otp:EMAIL_VERIFICATION:${user.id}`),
    ).toBeNull();

    const unknownResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/forgot-password')
      .send({ email: `unknown-${suffix}@example.com` })
      .expect(200);
    const existingResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/forgot-password')
      .send({ email })
      .expect(200);
    expect(existingResponse.body).toEqual(unknownResponse.body);

    const resetOtp = await redisUtil.findOne(`otp:PASSWORD_RESET:${user.id}`);
    expect(resetOtp).toMatch(/^\d{6}$/);
    expect(
      await emailLogRepository.countBy({
        recipient: email,
        type: EmailType.PASSWORD_RESET,
      }),
    ).toBe(1);

    await request(app.getHttpServer())
      .post('/api/v1/auth/reset-password')
      .send({ email, otp: resetOtp, newPassword: 'new-password123' })
      .expect(200);

    user = await userRepository.findOneByOrFail({ email });
    expect(await bcrypt.compare('new-password123', user.password)).toBe(true);
    expect(await redisUtil.findOne(`otp:PASSWORD_RESET:${user.id}`)).toBeNull();
  }, 30_000);

  it('persists booking-status and fixed review-deleted emails', async () => {
    const suffix = Date.now();
    const user = await userRepository.save({
      email: `domain-mail-${suffix}@example.com`,
      username: `domain-mail-${suffix}`,
      password: 'hashed-for-e2e',
      status: UserStatus.ACTIVE,
    });
    const room = await roomRepository.save({
      roomNumber: `MAIL-${suffix}`.slice(-20),
      name: 'Mail event E2E room',
      capacity: 2,
      pricePerNight: new Decimal(500_000),
      status: RoomStatus.ACTIVE,
    });
    const booking = await bookingRepository.save({
      userId: user.id,
      roomId: room.id,
      checkInDate: '2099-01-01',
      checkOutDate: '2099-01-02',
      guests: 1,
      pricePerNight: new Decimal(500_000),
      totalPrice: new Decimal(500_000),
      status: BookingStatus.PENDING,
      holdExpiresAt: new Date('2098-12-31T23:59:00.000Z'),
    });

    await bookingsService.accept(booking.id);
    expect(
      await emailLogRepository.countBy({
        recipient: user.email,
        type: EmailType.BOOKING_STATUS_CHANGED,
      }),
    ).toBe(1);

    const review = await reviewRepository.save({
      bookingId: booking.id,
      roomId: room.id,
      userId: user.id,
      rating: 5,
      comment: 'E2E review',
    });
    await reviewsService.remove(review.id);

    const reviewEmail = await emailLogRepository.findOneByOrFail({
      recipient: user.email,
      type: EmailType.REVIEW_DELETED,
    });
    expect(reviewEmail.text).toBe('Đánh giá của bạn đã được quản trị viên gỡ.');
    expect(reviewEmail.text).not.toContain(review.id);
    expect(reviewEmail.text).not.toContain('ADMIN_REMOVED');
  }, 30_000);

  it('validates OTP DTOs and protects mail test endpoints', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/activate')
      .send({ email: 'invalid', otp: '12' })
      .expect(400);
    await request(app.getHttpServer()).post('/api/v1/mail/test').expect(401);
    await request(app.getHttpServer()).get('/api/v1/mail/1').expect(401);
  });
});
