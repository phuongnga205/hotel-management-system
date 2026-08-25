import { MigrationInterface, QueryRunner } from 'typeorm';

// Thêm số khách (guests) vào booking — trước đây totalPrice chỉ tính theo
// nights * pricePerNight, không phản ánh số người ở thực tế, và
// rooms.capacity chưa từng được dùng để validate/lọc ở đâu cả. DEFAULT 1
// để không phải backfill script riêng cho các row đã tồn tại.
export class AddGuestsToBookings1787575138129 implements MigrationInterface {
  name = 'AddGuestsToBookings1787575138129';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "bookings" ADD COLUMN "guests" smallint NOT NULL DEFAULT 1
    `);
    await queryRunner.query(`
      ALTER TABLE "bookings" ADD CONSTRAINT "chk_bookings_guests" CHECK ("guests" > 0)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "bookings" DROP CONSTRAINT IF EXISTS "chk_bookings_guests"
    `);
    await queryRunner.query(`
      ALTER TABLE "bookings" DROP COLUMN IF EXISTS "guests"
    `);
  }
}
