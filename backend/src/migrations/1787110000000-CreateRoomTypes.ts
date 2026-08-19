import { MigrationInterface } from 'typeorm';

/**
 * Compatibility marker for databases that already recorded this migration.
 * Room types are stored directly in rooms.room_type by the initial schema, so
 * this migration intentionally performs no schema changes.
 */
export class CreateRoomTypes1787110000000 implements MigrationInterface {
  name = 'CreateRoomTypes1787110000000';

  public up(): Promise<void> {
    return Promise.resolve();
  }

  public down(): Promise<void> {
    return Promise.resolve();
  }
}
