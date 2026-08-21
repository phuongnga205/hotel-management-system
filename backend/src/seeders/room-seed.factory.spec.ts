import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { I18nService } from 'nestjs-i18n';
import {
  ENVIRONMENT_KEYS,
  NodeEnvironment,
} from '../config/environment.constants';
import {
  ROOM_SEED,
  ROOM_SEED_AMENITIES,
  ROOM_SEED_I18N_KEY,
} from './room-seed.constants';
import {
  buildRoomSeedRecords,
  getAmenityIndexesForRoom,
} from './room-seed.factory';
import { DatabaseSeedingGuardError, RoomsSeeder } from './rooms.seeder';

describe('Room seed factory', () => {
  it('generates 50 valid, uniquely numbered room records', () => {
    const rooms = buildRoomSeedRecords();

    expect(rooms).toHaveLength(ROOM_SEED.COUNT);
    expect(new Set(rooms.map(({ roomNumber }) => roomNumber)).size).toBe(
      ROOM_SEED.COUNT,
    );
    expect(rooms[0].roomNumber).toBe('SEED-001');
    expect(rooms[ROOM_SEED.COUNT - 1].roomNumber).toBe('SEED-050');
  });

  it('generates only valid amenity indexes', () => {
    const indexes = buildRoomSeedRecords().flatMap((_, roomIndex) =>
      getAmenityIndexesForRoom(roomIndex).map(
        (index) => index % ROOM_SEED_AMENITIES.length,
      ),
    );

    expect(indexes).toHaveLength(
      ROOM_SEED.COUNT * ROOM_SEED.AMENITIES_PER_ROOM,
    );
    expect(
      indexes.every((index) => ROOM_SEED_AMENITIES[index] !== undefined),
    ).toBe(true);
  });
});

describe('RoomsSeeder production guard', () => {
  const dataSource = {} as DataSource;
  const i18n = {
    t: jest.fn((key: string) => key),
  } as unknown as I18nService;

  it('rejects production even when seeding is enabled', async () => {
    const seeder = new RoomsSeeder(
      dataSource,
      new ConfigService({
        [ENVIRONMENT_KEYS.NODE_ENV]: NodeEnvironment.PRODUCTION,
        [ENVIRONMENT_KEYS.DATABASE_SEEDING_ENABLED]: ROOM_SEED.ENABLED_VALUE,
      }),
      i18n,
    );

    await expect(seeder.seed()).rejects.toEqual(
      new DatabaseSeedingGuardError(ROOM_SEED_I18N_KEY.PRODUCTION),
    );
  });

  it('rejects seeding unless it is explicitly enabled', async () => {
    const seeder = new RoomsSeeder(
      dataSource,
      new ConfigService({
        [ENVIRONMENT_KEYS.NODE_ENV]: NodeEnvironment.TEST,
      }),
      i18n,
    );

    await expect(seeder.seed()).rejects.toEqual(
      new DatabaseSeedingGuardError(ROOM_SEED_I18N_KEY.DISABLED),
    );
  });
});
