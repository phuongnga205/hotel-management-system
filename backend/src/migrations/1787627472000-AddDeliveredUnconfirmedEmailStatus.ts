import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDeliveredUnconfirmedEmailStatus1787627472000 implements MigrationInterface {
  name = 'AddDeliveredUnconfirmedEmailStatus1787627472000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "email_logs"
      DROP CONSTRAINT IF EXISTS "chk_email_logs_status"
    `);
    await queryRunner.query(`
      ALTER TABLE "email_logs"
      ADD CONSTRAINT "chk_email_logs_status"
      CHECK (
        "status" IN (
          'PENDING',
          'SENT',
          'FAILED',
          'DELIVERED_UNCONFIRMED'
        )
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // The legacy constraint does not accept this reconciliation status.
    await queryRunner.query(`
      UPDATE "email_logs"
      SET "status" = 'SENT'
      WHERE "status" = 'DELIVERED_UNCONFIRMED'
    `);
    await queryRunner.query(`
      ALTER TABLE "email_logs"
      DROP CONSTRAINT IF EXISTS "chk_email_logs_status"
    `);
    await queryRunner.query(`
      ALTER TABLE "email_logs"
      ADD CONSTRAINT "chk_email_logs_status"
      CHECK ("status" IN ('PENDING', 'SENT', 'FAILED'))
    `);
  }
}
