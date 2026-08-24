import 'dotenv/config';
import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { I18nService } from 'nestjs-i18n';
import { ENVIRONMENT_KEYS } from '../src/config/environment.constants';
import { CloudinaryService } from '../src/cloudinary/cloudinary.service';
import { RoomsService } from '../src/rooms/rooms.service';
import { Room } from '../src/rooms/entities/room.entity';
import { RoomStatus } from '../src/rooms/enums/room-status.enum';
import { Amenity } from '../src/amenities/entities/amenity.entity';
import { RoomAmenity } from '../src/amenities/entities/room-amenity.entity';
import { Booking } from '../src/bookings/entities/booking.entity';
import { BookingStatus } from '../src/bookings/enums/booking-status.enum';
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

describeWithDatabase(
  'RoomsService.findAvailableRooms (e2e, real Postgres)',
  () => {
    let dataSource: DataSource;
    let service: RoomsService;
    let roomWifiOnlyId: string;
    let roomWifiAndPoolId: string;
    let roomBookedId: string;
    let wifiName: string;
    let poolName: string;
    let userId: string;

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

      service = new RoomsService(
        dataSource,
        fakeI18n,
        new CloudinaryService(fakeConfig),
      );

      const suffix = Date.now() % 1000000;
      const [wifi, pool] = await dataSource
        .getRepository(Amenity)
        .save([{ name: `E2E-Wifi-${suffix}` }, { name: `E2E-Pool-${suffix}` }]);
      wifiName = wifi.name;
      poolName = pool.name;

      const [roomWifiOnly, roomWifiAndPool, roomBooked] = await dataSource
        .getRepository(Room)
        .save([
          {
            roomNumber: `E2EAVAIL-A-${suffix}`,
            name: 'E2E Available - Wifi only',
            capacity: 2,
            pricePerNight: '600000',
            status: RoomStatus.ACTIVE,
          },
          {
            roomNumber: `E2EAVAIL-B-${suffix}`,
            name: 'E2E Available - Wifi + Pool',
            capacity: 2,
            pricePerNight: '900000',
            status: RoomStatus.ACTIVE,
          },
          {
            roomNumber: `E2EAVAIL-C-${suffix}`,
            name: 'E2E Available - Booked out',
            capacity: 2,
            pricePerNight: '700000',
            status: RoomStatus.ACTIVE,
          },
        ]);
      roomWifiOnlyId = roomWifiOnly.id;
      roomWifiAndPoolId = roomWifiAndPool.id;
      roomBookedId = roomBooked.id;

      await dataSource.getRepository(RoomAmenity).save([
        { roomId: roomWifiOnly.id, amenityId: wifi.id },
        { roomId: roomWifiAndPool.id, amenityId: wifi.id },
        { roomId: roomWifiAndPool.id, amenityId: pool.id },
      ]);

      const user = await dataSource.getRepository(User).save({
        username: `e2e-available-${suffix}`,
        email: `e2e-available-${suffix}@example.com`,
        password: 'hashed',
        status: UserStatus.ACTIVE,
      });
      userId = user.id;

      await dataSource.getRepository(Booking).save({
        roomId: roomBooked.id,
        userId,
        status: BookingStatus.ACCEPTED,
        checkInDate: '2027-08-01',
        checkOutDate: '2027-08-03',
        pricePerNight: '700000',
        totalPrice: '1400000',
      });
    });

    afterAll(async () => {
      if (!dataSource?.isInitialized) return;
      const roomIds = [roomWifiOnlyId, roomWifiAndPoolId, roomBookedId];
      await dataSource.getRepository(Booking).delete({ roomId: roomBookedId });
      await dataSource
        .getRepository(RoomAmenity)
        .createQueryBuilder()
        .delete()
        .where('room_id = ANY(:roomIds)', { roomIds })
        .execute();
      await dataSource.getRepository(Room).delete(roomIds);
      await dataSource.getRepository(User).delete({ id: userId });
      await dataSource
        .getRepository(Amenity)
        .createQueryBuilder()
        .delete()
        .where('name LIKE :prefix', { prefix: 'E2E-%' })
        .execute();
      await dataSource.destroy();
    });

    it('không lỗi SQL alias JOIN và ẩn phòng đang có booking trùng ngày', async () => {
      const result = await service.findAvailableRooms({
        page: 1,
        limit: 20,
        checkIn: '2027-08-01',
        checkOut: '2027-08-03',
      });

      const ids = result.data.items.map((room) => room.id);
      expect(ids).toContain(roomWifiOnlyId);
      expect(ids).toContain(roomWifiAndPoolId);
      expect(ids).not.toContain(roomBookedId);
    });

    it('lọc theo nhiều tiện nghi là ALL (phải có đủ), không phải ANY', async () => {
      const result = await service.findAvailableRooms({
        page: 1,
        limit: 20,
        checkIn: '2027-08-10',
        checkOut: '2027-08-12',
        amenities: [wifiName, poolName],
      });

      const ids = result.data.items.map((room) => room.id);
      expect(ids).toContain(roomWifiAndPoolId);
      expect(ids).not.toContain(roomWifiOnlyId);
    });

    it('trả về phòng có wifi khi chỉ lọc theo 1 tiện nghi', async () => {
      const result = await service.findAvailableRooms({
        page: 1,
        limit: 20,
        checkIn: '2027-08-10',
        checkOut: '2027-08-12',
        amenities: [wifiName],
      });

      const ids = result.data.items.map((room) => room.id);
      expect(ids).toContain(roomWifiOnlyId);
      expect(ids).toContain(roomWifiAndPoolId);
    });

    it('reject minPrice > maxPrice bằng 400 thay vì trả danh sách rỗng', async () => {
      await expect(
        service.findAvailableRooms({
          page: 1,
          limit: 20,
          checkIn: '2027-08-10',
          checkOut: '2027-08-12',
          minPrice: 2000000,
          maxPrice: 500000,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('listRooms (GET /rooms) cũng không lỗi SQL alias JOIN', async () => {
      const result = await service.findPublicList({ page: 1, limit: 50 });
      const ids = result.data.items.map((room) => room.id);
      expect(ids).toContain(roomWifiAndPoolId);
    });
  },
);
