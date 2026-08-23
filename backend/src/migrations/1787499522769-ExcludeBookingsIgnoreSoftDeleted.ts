import { MigrationInterface, QueryRunner } from 'typeorm';

// excl_bookings_no_overlap (xem CreateInitialSchema) lọc theo `status IN
// ('PENDING','ACCEPTED')` nhưng không loại các booking đã soft-delete
// (deleted_at IS NOT NULL) — 1 booking PENDING/ACCEPTED đã bị xoá mềm vẫn
// tiếp tục chặn EXCLUDE constraint, khiến phòng/ngày đó không thể đặt lại
// dù ứng dụng coi booking đó không còn tồn tại.
export class ExcludeBookingsIgnoreSoftDeleted1787499522769 implements MigrationInterface {
  name = 'ExcludeBookingsIgnoreSoftDeleted1787499522769';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // IF EXISTS: 1 số DB (VD tạo bằng synchronize trước khi có migration
    // này) có thể chưa có sẵn excl_bookings_no_overlap dù CreateInitialSchema
    // giả định là có (TypeORM không có decorator cho EXCLUDE constraint) —
    // không giả định trạng thái trước đó, luôn kết thúc ở đúng 1 định nghĩa.
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS btree_gist`);
    await queryRunner.query(`
      ALTER TABLE "bookings" DROP CONSTRAINT IF EXISTS "excl_bookings_no_overlap"
    `);
    await queryRunner.query(`
      ALTER TABLE "bookings" ADD CONSTRAINT "excl_bookings_no_overlap"
      EXCLUDE USING gist (
        "room_id" WITH =,
        daterange("check_in_date", "check_out_date") WITH &&
      ) WHERE ("status" IN ('PENDING','ACCEPTED') AND "deleted_at" IS NULL)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "bookings" DROP CONSTRAINT IF EXISTS "excl_bookings_no_overlap"
    `);
    await queryRunner.query(`
      ALTER TABLE "bookings" ADD CONSTRAINT "excl_bookings_no_overlap"
      EXCLUDE USING gist (
        "room_id" WITH =,
        daterange("check_in_date", "check_out_date") WITH &&
      ) WHERE ("status" IN ('PENDING','ACCEPTED'))
    `);
  }
}
