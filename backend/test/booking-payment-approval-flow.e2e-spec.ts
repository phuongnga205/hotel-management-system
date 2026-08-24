import 'dotenv/config';
import { ConfigService } from '@nestjs/config';
import { ConflictException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { I18nService } from 'nestjs-i18n';
import { ENVIRONMENT_KEYS } from '../src/config/environment.constants';
import { BookingsService } from '../src/bookings/bookings.service';
import { Booking } from '../src/bookings/entities/booking.entity';
import { BookingStatus } from '../src/bookings/enums/booking-status.enum';
import { Room } from '../src/rooms/entities/room.entity';
import { RoomStatus } from '../src/rooms/enums/room-status.enum';
import { User, UserStatus } from '../src/users/entities/user.entity';
import { Payment } from '../src/payments/entities/payment.entity';
import { PaymentMethod } from '../src/payments/enums/payment-method.enum';
import { PaymentStatus } from '../src/payments/enums/payment-status.enum';

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

// Test toàn bộ luồng nghiệp vụ chính của booking trên Postgres thật (không
// mock Repository/QueryBuilder như bookings.service.spec.ts) — gọi thẳng
// BookingsService (giống pattern bookings-overlap.e2e-spec.ts), verify
// transaction + state cuối cùng trong DB đúng như thiết kế.
//
// 3 nhánh, đúng theo state machine của Booking (xem BookingsService):
//  - Nhánh A: đặt phòng -> khách tự thanh toán (pay()) -> tự ACCEPTED, có
//    Payment SUCCESS — admin không cần thao tác gì thêm.
//  - Nhánh B: đặt phòng -> Admin duyệt trực tiếp (accept()), không qua
//    thanh toán -> ACCEPTED nhưng chưa có Payment nào. Khách vẫn "trả bù"
//    được sau đó (pay() cho phép ACCEPTED + chưa có payment SUCCESS, không
//    giới hạn thời gian vì ACCEPTED không có hold) — nhưng chỉ trả được
//    đúng 1 lần, lần 2 bị chặn 409.
//  - Nhánh C: đặt phòng -> Admin từ chối (reject()) kèm lý do.
describeWithDatabase(
  'Booking → Payment → Admin approval flow (e2e, real Postgres)',
  () => {
    let dataSource: DataSource;
    let service: BookingsService;
    let userId: string;
    let roomId: string;

    const fakeI18n = { t: (key: string) => key } as unknown as I18nService;
    const fakeConfig = { get: () => undefined } as unknown as ConfigService;

    beforeAll(async () => {
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

      service = new BookingsService(
        dataSource.getRepository(Booking),
        dataSource.getRepository(Room),
        dataSource,
        fakeI18n,
        fakeConfig,
      );

      const user = await dataSource.getRepository(User).save({
        username: `e2e-flow-${Date.now()}`,
        email: `e2e-flow-${Date.now()}@example.com`,
        password: 'hashed',
        status: UserStatus.ACTIVE,
      });
      userId = user.id;

      const room = await dataSource.getRepository(Room).save({
        roomNumber: `E2EFLOW-${Date.now() % 1000000}`,
        name: 'E2E Flow Test Room',
        capacity: 2,
        pricePerNight: '500000',
        status: RoomStatus.ACTIVE,
      });
      roomId = room.id;
    });

    afterAll(async () => {
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
      await dataSource.getRepository(User).delete({ id: userId });
      await dataSource.destroy();
    });

    it('Nhánh A: đặt phòng → khách thanh toán → tự ACCEPTED kèm Payment SUCCESS', async () => {
      const createResult = await service.create(
        { roomId, checkInDate: '2027-03-01', checkOutDate: '2027-03-03' },
        userId,
      );
      const bookingId = createResult.data.id;

      const created = await dataSource
        .getRepository(Booking)
        .findOneOrFail({ where: { id: bookingId } });
      expect(created.status).toBe(BookingStatus.PENDING);
      expect(created.holdExpiresAt).not.toBeNull();

      const payResult = await service.pay(bookingId, userId, {
        method: PaymentMethod.VNPAY,
      });
      expect(payResult.statusCode).toBe(201);

      const paid = await dataSource
        .getRepository(Booking)
        .findOneOrFail({ where: { id: bookingId } });
      expect(paid.status).toBe(BookingStatus.ACCEPTED);
      expect(paid.holdExpiresAt).toBeNull();

      const payment = await dataSource
        .getRepository(Payment)
        .findOneOrFail({ where: { bookingId } });
      expect(payment.status).toBe(PaymentStatus.SUCCESS);
      expect(payment.method).toBe(PaymentMethod.VNPAY);
      // Payment.amount không có transformer (giữ nguyên format Postgres trả
      // về, VD "1000000.00"), khác Booking.totalPrice qua decimalTransformer
      // (Decimal#toString() bỏ số 0 thừa, VD "1000000") — so bằng Number(...)
      // để không phụ thuộc cách format, chỉ cần đúng giá trị.
      expect(Number(payment.amount)).toBe(Number(created.totalPrice));
      expect(payment.transactionId).not.toBeNull();
      expect(payment.paidAt).not.toBeNull();

      // Trả tiền lần 2 cho booking đã ACCEPTED phải bị chặn (409) — không cho
      // thanh toán trùng.
      await expect(
        service.pay(bookingId, userId, { method: PaymentMethod.CASH }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('Nhánh B: đặt phòng → Admin duyệt trực tiếp (không qua thanh toán) → khách vẫn "trả bù" được sau đó, không giới hạn thời gian, nhưng chỉ 1 lần', async () => {
      const createResult = await service.create(
        { roomId, checkInDate: '2027-04-01', checkOutDate: '2027-04-03' },
        userId,
      );
      const bookingId = createResult.data.id;

      const acceptResult = await service.accept(bookingId);
      expect(acceptResult.statusCode).toBe(200);

      const accepted = await dataSource
        .getRepository(Booking)
        .findOneOrFail({ where: { id: bookingId } });
      expect(accepted.status).toBe(BookingStatus.ACCEPTED);
      expect(accepted.holdExpiresAt).toBeNull();

      const paymentBeforePay = await dataSource
        .getRepository(Payment)
        .findOne({ where: { bookingId } });
      expect(paymentBeforePay).toBeNull();

      // "Trả bù": booking đã ACCEPTED (do Admin duyệt thẳng, chưa hề có
      // payment nào) — khách vẫn trả được, không giới hạn thời gian vì
      // ACCEPTED không còn hold. Status không đổi (đã ACCEPTED sẵn).
      const catchUpPayResult = await service.pay(bookingId, userId, {
        method: PaymentMethod.VNPAY,
      });
      expect(catchUpPayResult.statusCode).toBe(201);

      const stillAccepted = await dataSource
        .getRepository(Booking)
        .findOneOrFail({ where: { id: bookingId } });
      expect(stillAccepted.status).toBe(BookingStatus.ACCEPTED);

      const payment = await dataSource
        .getRepository(Payment)
        .findOneOrFail({ where: { bookingId } });
      expect(payment.status).toBe(PaymentStatus.SUCCESS);
      expect(payment.method).toBe(PaymentMethod.VNPAY);

      // Trả bù lần 2 cho booking đã có payment SUCCESS rồi phải bị chặn
      // (409) — không cho trả trùng.
      await expect(
        service.pay(bookingId, userId, { method: PaymentMethod.CASH }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('Nhánh C: đặt phòng → Admin từ chối kèm lý do', async () => {
      const createResult = await service.create(
        { roomId, checkInDate: '2027-05-01', checkOutDate: '2027-05-03' },
        userId,
      );
      const bookingId = createResult.data.id;

      const rejectResult = await service.reject(bookingId, {
        cancelReason: 'Phòng cần bảo trì đột xuất',
      });
      expect(rejectResult.statusCode).toBe(200);

      const rejected = await dataSource
        .getRepository(Booking)
        .findOneOrFail({ where: { id: bookingId } });
      expect(rejected.status).toBe(BookingStatus.REJECTED);
      expect(rejected.cancelReason).toBe('Phòng cần bảo trì đột xuất');
    });
  },
);
