import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource, EntityManager, In } from 'typeorm';
import { Seeder } from 'nestjs-seeder';
import { I18nService } from 'nestjs-i18n';
import { Amenity } from '../amenities/entities/amenity.entity';
import { RoomAmenity } from '../amenities/entities/room-amenity.entity';
import { Room } from '../rooms/entities/room.entity';
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

@Injectable()
export class RoomsSeeder implements Seeder {
  constructor(
    private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
    private readonly i18n: I18nService,
  ) {}

  async seed(): Promise<void> {
    this.assertSeedingAllowed();
    const records = buildRoomSeedRecords();

    await this.dataSource.transaction(async (manager) => {
      const amenities = await this.upsertAmenities(manager);
      const rooms = await this.upsertRooms(manager, records);
      await this.replaceRoomAmenities(manager, rooms, amenities);
    });
  }

  async drop(): Promise<void> {
    this.assertSeedingAllowed();
    const roomNumbers = buildRoomSeedRecords().map(
      ({ roomNumber }) => roomNumber,
    );
    await this.dataSource.transaction(async (manager) => {
      const roomRepository = manager.getRepository(Room);
      const rooms = await roomRepository
        .createQueryBuilder('room')
        .select(['room.id'])
        .withDeleted()
        .where('room.roomNumber IN (:...roomNumbers)', { roomNumbers })
        .getMany();
      const roomIds = rooms.map(({ id }) => id);
      if (roomIds.length === 0) return;

      await manager.getRepository(RoomAmenity).delete({ roomId: In(roomIds) });
      await roomRepository.softDelete(roomIds);
    });
  }

  private assertSeedingAllowed(): void {
    const environment = this.configService.get<NodeEnvironment>(
      ENVIRONMENT_KEYS.NODE_ENV,
      NodeEnvironment.DEVELOPMENT,
    );
    if (environment === NodeEnvironment.PRODUCTION) {
      throw new DatabaseSeedingGuardError(
        this.i18n.t(ROOM_SEED_I18N_KEY.PRODUCTION),
      );
    }

    const isEnabled =
      this.configService.get<string>(
        ENVIRONMENT_KEYS.DATABASE_SEEDING_ENABLED,
        ROOM_SEED.DISABLED_VALUE,
      ) === ROOM_SEED.ENABLED_VALUE;
    if (!isEnabled) {
      throw new DatabaseSeedingGuardError(
        this.i18n.t(ROOM_SEED_I18N_KEY.DISABLED),
      );
    }
  }

  private async upsertAmenities(manager: EntityManager): Promise<Amenity[]> {
    const repository = manager.getRepository(Amenity);
    const names = ROOM_SEED_AMENITIES.map(({ name }) => name);
    const existing = await repository
      .createQueryBuilder('amenity')
      .withDeleted()
      .where('amenity.name IN (:...names)', { names })
      .getMany();
    const existingByName = new Map(existing.map((item) => [item.name, item]));
    const amenities = ROOM_SEED_AMENITIES.map((record) =>
      repository.create({
        ...existingByName.get(record.name),
        ...record,
        deletedAt: null,
      }),
    );
    return repository.save(amenities);
  }

  private async upsertRooms(
    manager: EntityManager,
    records: ReturnType<typeof buildRoomSeedRecords>,
  ): Promise<Room[]> {
    const repository = manager.getRepository(Room);
    const roomNumbers = records.map(({ roomNumber }) => roomNumber);
    const existing = await repository
      .createQueryBuilder('room')
      .withDeleted()
      .where('room.roomNumber IN (:...roomNumbers)', { roomNumbers })
      .getMany();
    const existingByNumber = new Map(
      existing.map((room) => [room.roomNumber, room]),
    );
    const rooms = records.map((record) =>
      repository.create({
        ...existingByNumber.get(record.roomNumber),
        ...record,
        deletedAt: null,
      }),
    );
    return repository.save(rooms);
  }

  private async replaceRoomAmenities(
    manager: EntityManager,
    rooms: Room[],
    amenities: Amenity[],
  ): Promise<void> {
    const repository = manager.getRepository(RoomAmenity);
    const roomIds = rooms.map(({ id }) => id);
    await repository.delete({ roomId: In(roomIds) });

    const mappings = rooms.flatMap((room, roomIndex) =>
      getAmenityIndexesForRoom(roomIndex).map((amenityIndex) =>
        repository.create({
          roomId: room.id,
          amenityId: amenities[amenityIndex % amenities.length].id,
        }),
      ),
    );
    await repository.save(mappings);
  }
}

export class DatabaseSeedingGuardError extends Error {
  constructor(message: string) {
    super(message);
    this.name = DatabaseSeedingGuardError.name;
  }
}
