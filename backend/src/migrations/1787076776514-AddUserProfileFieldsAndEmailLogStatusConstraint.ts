import { MigrationInterface, QueryRunner } from 'typeorm';

// Hotfix cho phần lệch giữa db.md (thiết kế gốc) và schema thật đang chạy
// trên Neon, phát hiện khi rà lại tài liệu cho FE:
//   - users.full_name và users.activated_at có trong db.md nhưng bị thiếu
//     ở migration CreateInitialSchema.
//   - email_logs.status thiếu DEFAULT 'PENDING' và thiếu CHECK constraint
//     giới hạn giá trị hợp lệ, không nhất quán với mọi cột status khác
//     trong hệ thống (users, rooms, bookings, payments đều có CHECK).
export class AddUserProfileFieldsAndEmailLogStatusConstraint1787076776514 implements MigrationInterface {
  name = 'AddUserProfileFieldsAndEmailLogStatusConstraint1787076776514';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users" ADD COLUMN "full_name" varchar(150)
    `);
    await queryRunner.query(`
      ALTER TABLE "users" ADD COLUMN "activated_at" timestamptz
    `);

    await queryRunner.query(`
      ALTER TABLE "email_logs" ALTER COLUMN "status" SET DEFAULT 'PENDING'
    `);
    await queryRunner.query(`
      ALTER TABLE "email_logs" ADD CONSTRAINT "chk_email_logs_status"
      CHECK ("status" IN ('PENDING','SENT','FAILED'))
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "email_logs" DROP CONSTRAINT "chk_email_logs_status"
    `);
    await queryRunner.query(`
      ALTER TABLE "email_logs" ALTER COLUMN "status" DROP DEFAULT
    `);

    await queryRunner.query(`
      ALTER TABLE "users" DROP COLUMN "activated_at"
    `);
    await queryRunner.query(`
      ALTER TABLE "users" DROP COLUMN "full_name"
    `);
  }
}
