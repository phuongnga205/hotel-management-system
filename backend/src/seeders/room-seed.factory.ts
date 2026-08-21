import { Factory, DataFactory } from 'nestjs-seeder';
import { RoomStatus } from '../rooms/enums/room-status.enum';
import { RoomViewType } from '../rooms/enums/room-view-type.enum';
import { ROOM_SEED } from './room-seed.constants';

const ROOM_TYPES = ['STANDARD', 'DELUXE', 'SUITE', 'FAMILY'] as const;
const ROOM_STATUSES = Object.values(RoomStatus);
const ROOM_VIEW_TYPES = Object.values(RoomViewType);

class RoomSeedFactory {
  @Factory((faker) => faker!.helpers.arrayElement(ROOM_TYPES))
  roomType!: string;

  @Factory((faker) => faker!.lorem.sentence())
  description!: string;

  @Factory((faker) => faker!.helpers.arrayElement(ROOM_VIEW_TYPES))
  viewType!: RoomViewType;

  @Factory((faker) =>
    faker!.number.int({
      min: ROOM_SEED.MIN_CAPACITY,
      max: ROOM_SEED.MAX_CAPACITY,
    }),
  )
  capacity!: number;

  @Factory(
    (faker) =>
      faker!.number.int({
        min: ROOM_SEED.MIN_PRICE_MULTIPLIER,
        max: ROOM_SEED.MAX_PRICE_MULTIPLIER,
      }) * ROOM_SEED.PRICE_STEP,
  )
  pricePerNight!: number;

  @Factory((faker) => faker!.helpers.arrayElement(ROOM_STATUSES))
  status!: RoomStatus;
}

export interface RoomSeedRecord {
  roomNumber: string;
  name: string;
  roomType: string;
  description: string;
  viewType: RoomViewType;
  capacity: number;
  pricePerNight: number;
  status: RoomStatus;
}

export function buildRoomSeedRecords(): RoomSeedRecord[] {
  const generated = DataFactory.createForClass(RoomSeedFactory).generate(
    ROOM_SEED.COUNT,
  ) as unknown as Omit<RoomSeedRecord, 'roomNumber' | 'name'>[];

  return generated.map((record, index) => {
    const sequence = String(index + 1).padStart(ROOM_SEED.NUMBER_PADDING, '0');
    return {
      ...record,
      roomNumber: `${ROOM_SEED.NUMBER_PREFIX}${sequence}`,
      name: `Sample Room ${sequence}`,
    };
  });
}

export function getAmenityIndexesForRoom(roomIndex: number): number[] {
  return Array.from(
    { length: ROOM_SEED.AMENITIES_PER_ROOM },
    (_, offset) => roomIndex + offset,
  );
}
