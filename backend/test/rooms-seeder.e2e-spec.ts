import 'dotenv/config';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { I18nService } from 'nestjs-i18n';
import { RoomAmenity } from '../src/amenities/entities/room-amenity.entity';
import {
  ENVIRONMENT_KEYS,
  NodeEnvironment,
} from '../src/config/environment.constants';
import { Room } from '../src/rooms/entities/room.entity';
import { ROOM_SEED } from '../src/seeders/room-seed.constants';
import { RoomsSeeder } from '../src/seeders/rooms.seeder';

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

describeWithDatabase('RoomsSeeder (e2e)', () => {
  let dataSource: DataSource;
  let roomsSeeder: RoomsSeeder;

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
    roomsSeeder = new RoomsSeeder(
      dataSource,
      new ConfigService({
        [ENVIRONMENT_KEYS.NODE_ENV]: NodeEnvironment.TEST,
        [ENVIRONMENT_KEYS.DATABASE_SEEDING_ENABLED]: ROOM_SEED.ENABLED_VALUE,
      }),
      {
        t: (key: string) => key,
      } as unknown as I18nService,
    );
  });

  it('creates exactly 50 rooms with valid amenity foreign keys', async () => {
    await roomsSeeder.seed();

    const rooms = await dataSource
      .getRepository(Room)
      .createQueryBuilder('room')
      .where('room.roomNumber LIKE :prefix', {
        prefix: `${ROOM_SEED.NUMBER_PREFIX}%`,
      })
      .getMany();
    const roomIds = rooms.map(({ id }) => id);
    const mappingCount = await dataSource
      .getRepository(RoomAmenity)
      .createQueryBuilder('roomAmenity')
      .innerJoin('roomAmenity.room', 'room')
      .innerJoin('roomAmenity.amenity', 'amenity')
      .where('roomAmenity.roomId IN (:...roomIds)', { roomIds })
      .getCount();

    expect(rooms).toHaveLength(ROOM_SEED.COUNT);
    expect(mappingCount).toBe(ROOM_SEED.COUNT * ROOM_SEED.AMENITIES_PER_ROOM);
  });

  it('is idempotent when the console seeder runs again', async () => {
    await roomsSeeder.seed();

    const roomCount = await dataSource
      .getRepository(Room)
      .createQueryBuilder('room')
      .where('room.roomNumber LIKE :prefix', {
        prefix: `${ROOM_SEED.NUMBER_PREFIX}%`,
      })
      .getCount();

    expect(roomCount).toBe(ROOM_SEED.COUNT);
  });

  afterAll(async () => {
    if (!dataSource?.isInitialized) return;
    await roomsSeeder.drop();
    await dataSource.destroy();
  });
});
