import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddStatisticsQueryIndexes1787296000000 implements MigrationInterface {
  name = 'AddStatisticsQueryIndexes1787296000000';
  transaction = false;

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_payments_success_paid_at"
      ON "payments" ("paid_at")
      WHERE "status" = 'SUCCESS' AND "deleted_at" IS NULL
    `);
    await queryRunner.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_bookings_created_at"
      ON "bookings" ("created_at")
      WHERE "deleted_at" IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'DROP INDEX CONCURRENTLY IF EXISTS "idx_bookings_created_at"',
    );
    await queryRunner.query(
      'DROP INDEX CONCURRENTLY IF EXISTS "idx_payments_success_paid_at"',
    );
  }
}
