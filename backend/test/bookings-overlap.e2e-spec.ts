import 'dotenv/config';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ConflictException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { I18nService } from 'nestjs-i18n';
import { ENVIRONMENT_KEYS } from '../src/config/environment.constants';
import { BookingsService } from '../src/bookings/bookings.service';
import { Booking } from '../src/bookings/entities/booking.entity';
import { Room } from '../src/rooms/entities/room.entity';
import { RoomStatus } from '../src/rooms/enums/room-status.enum';
import { User, UserStatus } from '../src/users/entities/user.entity';

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

// Mục #13 review: mock QueryFailedError({ code: '23P01' }) chỉ chứng minh
// service BIẾT cách map exclusion_violation sang ConflictException, không
// chứng minh Postgres THỰC SỰ chặn được 2 request đặt trùng phòng chạy song
// song (đúng race condition mà EXCLUDE constraint + transaction được thiết
// kế để chống — xem BookingsService.create()). Test này gọi thẳng
// BookingsService.create() (không mock) trên 1 Postgres thật, bắn 2 request
// tạo booking cùng phòng/cùng ngày đồng thời bằng Promise.allSettled.
describeWithDatabase('BookingsService overlap (e2e, real Postgres)', () => {
  let dataSource: DataSource;
  let service: BookingsService;
  let roomId: string;
  let userId: string;

  const fakeI18n = { t: (key: string) => key } as unknown as I18nService;
  const fakeConfig = { get: () => undefined } as unknown as ConfigService;
  const fakeEvents = {
    emitAsync: jest.fn().mockResolvedValue([]),
  } as unknown as EventEmitter2;

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
      fakeEvents,
    );

    const user = await dataSource.getRepository(User).save({
      username: `e2e-overlap-${Date.now()}`,
      email: `e2e-overlap-${Date.now()}@example.com`,
      password: 'hashed',
      status: UserStatus.ACTIVE,
    });
    userId = user.id;

    const room = await dataSource.getRepository(Room).save({
      roomNumber: `E2E-${Date.now() % 1000000}`,
      name: 'E2E Overlap Test Room',
      capacity: 2,
      pricePerNight: '1000000',
      status: RoomStatus.ACTIVE,
    });
    roomId = room.id;
  });

  afterAll(async () => {
    if (!dataSource?.isInitialized) return;
    await dataSource.getRepository(Booking).delete({ roomId });
    await dataSource.getRepository(Room).delete({ id: roomId });
    await dataSource.getRepository(User).delete({ id: userId });
    await dataSource.destroy();
  });

  it('lets exactly 1 of 2 concurrent create() calls for the same room/dates win', async () => {
    const dto = {
      roomId,
      checkInDate: '2027-01-10',
      checkOutDate: '2027-01-12',
      guests: 2,
    };

    const results = await Promise.allSettled([
      service.create(dto, userId),
      service.create(dto, userId),
    ]);

    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r) => r.status === 'rejected');

    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect(rejected[0].reason).toBeInstanceOf(ConflictException);

    const bookings = await dataSource
      .getRepository(Booking)
      .find({ where: { roomId } });
    expect(bookings).toHaveLength(1);
  });
});
