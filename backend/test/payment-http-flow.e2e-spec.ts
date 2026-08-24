import 'dotenv/config';
import * as path from 'path';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { INestApplication } from '@nestjs/common';
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
import request from 'supertest';
import { App } from 'supertest/types';
import { DataSource } from 'typeorm';
import { ENVIRONMENT_KEYS } from '../src/config/environment.constants';
import { AuthModule } from '../src/auth/auth.module';
import { TokenModule } from '../src/token/token.module';
import { RedisUtil } from '../src/token/redis.util';
import { BookingsModule } from '../src/bookings/bookings.module';
import { PaymentsModule } from '../src/payments/payments.module';
import { BCRYPT_SALT_ROUNDS } from '../src/auth/auth.service';
import { User, UserRole, UserStatus } from '../src/users/entities/user.entity';
import { Room } from '../src/rooms/entities/room.entity';
import { RoomStatus } from '../src/rooms/enums/room-status.enum';
import { Booking } from '../src/bookings/entities/booking.entity';
import { Payment } from '../src/payments/entities/payment.entity';
import { PaymentMethod } from '../src/payments/enums/payment-method.enum';

const configService = new ConfigService();
const e2eDatabaseUrl = configService.get<string>(
  ENVIRONMENT_KEYS.E2E_DATABASE_URL,
);
const applicationDatabaseUrl = configService.get<string>(
  ENVIRONMENT_KEYS.DATABASE_URL,
);
const hasIsolatedDatabase =
  Boolean(e2eDatabaseUrl) && e2eDatabaseUrl !== applicationDatabaseUrl;
const describeWithDatabase = hasIsolatedDatabase ? describe : describe.skip;

const TEST_PASSWORD = 'Test@123456';
const API_PREFIX = '/api/v1';

interface LoginResponseBody {
  accessToken: string;
}

interface BookingResponseBody {
  data: { id: string };
}

interface PaymentListItem {
  bookingId: string;
}

interface PaymentListResponseBody {
  data: { items: PaymentListItem[] };
}

interface PaySuccessResponseBody {
  statusCode: number;
}

// Redis chỉ dùng cho blacklist token (logout) + OTP — không phải thứ đang
// test ở đây, và không đảm bảo có sẵn Redis khi chạy `test:e2e` local/CI.
// Stub in-memory thay RedisUtil thật (qua overrideProvider) để cả app boot
// thật (guard/strategy gọi TokenUtil.isRevoked() ở mọi request) mà không
// phụ thuộc 1 service ngoài không liên quan tới payment.
class InMemoryRedisUtil {
  private readonly store = new Map<string, string>();

  save(key: string, value: string, ttlSeconds: number): Promise<void> {
    if (ttlSeconds > 0) this.store.set(key, value);
    return Promise.resolve();
  }

  findOne(key: string): Promise<string | null> {
    return Promise.resolve(this.store.has(key) ? this.store.get(key)! : null);
  }

  delete(key: string): Promise<void> {
    this.store.delete(key);
    return Promise.resolve();
  }
}

// Khác với booking-payment-approval-flow.e2e-spec.ts (gọi thẳng
// BookingsService.pay()/accept()/reject(), bỏ qua HTTP/Guard/JWT hoàn toàn)
// — file này boot app Nest thật (AuthModule + BookingsModule +
// PaymentsModule, global prefix + ValidationPipe giống main.ts) và đi qua
// supertest: đăng nhập lấy accessToken thật từ /auth/login, gắn Bearer token
// vào mọi request, để JwtAuthGuard/RolesGuard/JwtStrategy chạy đúng như
// production — không mock guard nào. Mục tiêu:
//  1. Luồng thanh toán đầy đủ có xác thực: login -> tạo booking -> pay ->
//     xem lại trong "lịch sử thanh toán của tôi" (GET /payments/me).
//  2. Chặn truy cập khi chưa đăng nhập (401) và khi không đủ quyền admin
//     (403) trên GET /admin/payments.
//  3. Đúng phần câu hỏi "pay có chặn theo status booking không": xác nhận
//     qua HTTP rằng booking REJECTED bị chặn thanh toán (409), khớp logic
//     BookingsService.pay() chỉ nhận PENDING (hold còn hạn) hoặc ACCEPTED
//     (chưa có Payment SUCCESS).
describeWithDatabase(
  'Payment flow over HTTP (e2e, real Postgres + auth)',
  () => {
    let app: INestApplication<App>;
    let dataSource: DataSource;
    let roomId: string;
    let customerToken: string;
    let adminToken: string;
    let customerId: string;
    let adminId: string;

    beforeAll(async () => {
      // DataSource riêng chỉ để chạy migration + seed/dọn dữ liệu test, tách
      // khỏi connection pool mà app Nest thật sự dùng để phục vụ request —
      // đúng pattern các file e2e khác trong thư mục này.
      dataSource = new DataSource({
        type: 'postgres',
        url: e2eDatabaseUrl,
        ssl: false,
        synchronize: false,
        entities: [__dirname + '/../src/**/*.entity{.ts,.js}'],
        migrations: [__dirname + '/../src/migrations/*{.ts,.js}'],
      });
      await dataSource.initialize();
      await dataSource.runMigrations();

      const passwordHash = await bcrypt.hash(TEST_PASSWORD, BCRYPT_SALT_ROUNDS);
      const customer = await dataSource.getRepository(User).save({
        username: `e2e-http-customer-${Date.now()}`,
        email: `e2e-http-customer-${Date.now()}@example.com`,
        password: passwordHash,
        status: UserStatus.ACTIVE,
        role: UserRole.USER,
      });
      customerId = customer.id;

      const admin = await dataSource.getRepository(User).save({
        username: `e2e-http-admin-${Date.now()}`,
        email: `e2e-http-admin-${Date.now()}@example.com`,
        password: passwordHash,
        status: UserStatus.ACTIVE,
        role: UserRole.ADMIN,
      });
      adminId = admin.id;

      const room = await dataSource.getRepository(Room).save({
        roomNumber: `E2EHTTP-${Date.now() % 1000000}`,
        name: 'E2E HTTP Payment Test Room',
        capacity: 2,
        pricePerNight: '800000',
        status: RoomStatus.ACTIVE,
      });
      roomId = room.id;

      const moduleFixture = await Test.createTestingModule({
        imports: [
          ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
          ThrottlerModule.forRoot([{ ttl: 60000, limit: 10 }]),
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
            ssl: false,
            synchronize: false,
            // Không dùng autoLoadEntities: true — nó chỉ nạp entity của các
            // module có mặt trong TestingModule này (AuthModule/BookingsModule/
            // PaymentsModule), nhưng Room có quan hệ tới RoomAmenity (đăng ký ở
            // AmenitiesModule, không import ở đây) nên TypeORM báo thiếu
            // metadata. Nạp thẳng toàn bộ entity bằng glob, giống DataSource
            // riêng ở beforeAll và các file e2e khác trong thư mục này.
            entities: [__dirname + '/../src/**/*.entity{.ts,.js}'],
            logging: false,
          }),
          TokenModule,
          AuthModule,
          BookingsModule,
          PaymentsModule,
        ],
      })
        .overrideProvider(RedisUtil)
        .useValue(new InMemoryRedisUtil())
        .compile();

      app = moduleFixture.createNestApplication();
      app.setGlobalPrefix('api/v1');
      app.useGlobalFilters(new I18nValidationExceptionFilter());
      app.useGlobalPipes(
        new I18nValidationPipe({ whitelist: true, transform: true }),
      );
      await app.init();

      const [customerLogin, adminLogin] = await Promise.all([
        request(app.getHttpServer())
          .post(`${API_PREFIX}/auth/login`)
          .send({ email: customer.email, password: TEST_PASSWORD }),
        request(app.getHttpServer())
          .post(`${API_PREFIX}/auth/login`)
          .send({ email: admin.email, password: TEST_PASSWORD }),
      ]);
      customerToken = (customerLogin.body as LoginResponseBody).accessToken;
      adminToken = (adminLogin.body as LoginResponseBody).accessToken;
    });

    afterAll(async () => {
      if (app) await app.close();
      if (!dataSource?.isInitialized) return;
      await dataSource
        .getRepository(Payment)
        .createQueryBuilder()
        .delete()
        .where(
          'booking_id IN (SELECT id FROM bookings WHERE room_id = :roomId)',
          { roomId },
        )
        .execute();
      await dataSource.getRepository(Booking).delete({ roomId });
      await dataSource.getRepository(Room).delete({ id: roomId });
      await dataSource.getRepository(User).delete({ id: customerId });
      await dataSource.getRepository(User).delete({ id: adminId });
      await dataSource.destroy();
    });

    it('login trả về accessToken thật (không mock JwtStrategy/Guard)', () => {
      expect(customerToken).toEqual(expect.any(String));
      expect(adminToken).toEqual(expect.any(String));
    });

    it('chặn truy cập lịch sử thanh toán khi chưa đăng nhập (401)', async () => {
      await request(app.getHttpServer())
        .get(`${API_PREFIX}/payments/me`)
        .expect(401);
    });

    it('chặn khách hàng thường xem GET /admin/payments (403)', async () => {
      await request(app.getHttpServer())
        .get(`${API_PREFIX}/admin/payments`)
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(403);
    });

    it(
      'luồng đầy đủ có xác thực: đặt phòng -> thanh toán -> thấy trong ' +
        '"của tôi" lẫn danh sách admin',
      async () => {
        const createRes = await request(app.getHttpServer())
          .post(`${API_PREFIX}/bookings`)
          .set('Authorization', `Bearer ${customerToken}`)
          .send({
            roomId,
            checkInDate: '2027-06-01',
            checkOutDate: '2027-06-03',
          })
          .expect(201);
        const bookingId = (createRes.body as BookingResponseBody).data.id;

        const payRes = await request(app.getHttpServer())
          .post(`${API_PREFIX}/bookings/${bookingId}/pay`)
          .set('Authorization', `Bearer ${customerToken}`)
          .send({ method: PaymentMethod.VNPAY })
          .expect(201);
        expect((payRes.body as PaySuccessResponseBody).statusCode).toBe(201);

        const mineRes = await request(app.getHttpServer())
          .get(`${API_PREFIX}/payments/me`)
          .set('Authorization', `Bearer ${customerToken}`)
          .expect(200);
        expect(
          (mineRes.body as PaymentListResponseBody).data.items.some(
            (item) => item.bookingId === bookingId,
          ),
        ).toBe(true);

        const adminRes = await request(app.getHttpServer())
          .get(`${API_PREFIX}/admin/payments`)
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);
        expect(
          (adminRes.body as PaymentListResponseBody).data.items.some(
            (item) => item.bookingId === bookingId,
          ),
        ).toBe(true);

        // Trả trùng lần 2 phải bị chặn — booking đã ACCEPTED và đã có Payment
        // SUCCESS rồi (CANNOT_PAY / ALREADY_PAID, tuỳ nhánh trong
        // BookingsService.pay()).
        await request(app.getHttpServer())
          .post(`${API_PREFIX}/bookings/${bookingId}/pay`)
          .set('Authorization', `Bearer ${customerToken}`)
          .send({ method: PaymentMethod.CASH })
          .expect(409);
      },
    );

    it('chặn thanh toán booking đã REJECTED (409) — đúng câu hỏi status booking', async () => {
      const createRes = await request(app.getHttpServer())
        .post(`${API_PREFIX}/bookings`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          roomId,
          checkInDate: '2027-07-01',
          checkOutDate: '2027-07-03',
        })
        .expect(201);
      const bookingId = (createRes.body as BookingResponseBody).data.id;

      await request(app.getHttpServer())
        .patch(`${API_PREFIX}/admin/bookings/${bookingId}/reject`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ cancelReason: 'Phòng cần bảo trì' })
        .expect(200);

      await request(app.getHttpServer())
        .post(`${API_PREFIX}/bookings/${bookingId}/pay`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ method: PaymentMethod.VNPAY })
        .expect(409);
    });
  },
);
