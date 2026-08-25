import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMailOutboxAndReports1787308765309 implements MigrationInterface {
  name = 'AddMailOutboxAndReports1787308765309';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create UUID extension if not exists
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    // Add columns to email_logs with defaults to prevent NOT NULL errors on existing rows
    await queryRunner.query(`
      ALTER TABLE "email_logs"
      ADD "recipient_user_id" bigint,
      ADD "report_month" character varying(7),
      ADD "retry_generation" integer NOT NULL DEFAULT 0,
      ADD "html" text,
      ADD "text" text NOT NULL DEFAULT '',
      ADD "subject" character varying(255) NOT NULL DEFAULT ''
    `);

    // Remove defaults after adding columns if you want them to be strictly required for future inserts
    await queryRunner.query(`
      ALTER TABLE "email_logs"
      ALTER COLUMN "text" DROP DEFAULT,
      ALTER COLUMN "subject" DROP DEFAULT
    `);

    // Add CHECK constraint for retry_generation
    await queryRunner.query(`
      ALTER TABLE "email_logs"
      ADD CONSTRAINT "chk_email_logs_retry_generation" CHECK ("retry_generation" >= 0)
    `);

    // Add FOREIGN KEY for recipient_user_id
    await queryRunner.query(`
      ALTER TABLE "email_logs"
      ADD CONSTRAINT "fk_email_logs_recipient"
      FOREIGN KEY ("recipient_user_id") REFERENCES "users"("id") ON DELETE SET NULL
    `);

    // Drop and re-add status constraint for email_logs to include DELIVERED_UNCONFIRMED
    await queryRunner.query(`
      ALTER TABLE "email_logs"
      DROP CONSTRAINT IF EXISTS "chk_email_logs_status"
    `);
    await queryRunner.query(`
      ALTER TABLE "email_logs"
      ADD CONSTRAINT "chk_email_logs_status" CHECK ("status" IN ('PENDING', 'SENT', 'FAILED', 'DELIVERED_UNCONFIRMED'))
    `);

    // Create unique index for monthly reports on email_logs
    await queryRunner.query(`
      CREATE UNIQUE INDEX "uq_monthly_report_recipient_month" 
      ON "email_logs" ("report_month", "recipient_user_id") 
      WHERE "type" = 'monthly-report' AND "report_month" IS NOT NULL AND "recipient_user_id" IS NOT NULL
    `);

    // Create mail_outbox table (no updated_at since entity doesn't have it)
    await queryRunner.query(`
      CREATE TABLE "mail_outbox" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "email_log_id" bigint NOT NULL,
        "retry_generation" integer NOT NULL DEFAULT 0,
        "payload" jsonb NOT NULL,
        "status" character varying(20) NOT NULL DEFAULT 'PENDING',
        "attempt_count" smallint NOT NULL DEFAULT 0,
        "next_attempt_at" TIMESTAMP WITH TIME ZONE,
        "locked_at" TIMESTAMP WITH TIME ZONE,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_mail_outbox" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(
      `ALTER TABLE "mail_outbox" ADD CONSTRAINT "chk_mail_outbox_status" CHECK ("status" IN ('PENDING', 'PROCESSING', 'PROCESSED', 'FAILED'))`,
    );

    await queryRunner.query(`
      CREATE INDEX "idx_mail_outbox_status_created_at" ON "mail_outbox" ("status", "created_at")
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX "uq_mail_outbox_generation" ON "mail_outbox" ("email_log_id", "retry_generation")
    `);

    // Add FK for mail_outbox -> email_logs
    await queryRunner.query(`
      ALTER TABLE "mail_outbox"
      ADD CONSTRAINT "fk_mail_outbox_email_log"
      FOREIGN KEY ("email_log_id") REFERENCES "email_logs"("id") ON DELETE CASCADE
    `);

    // Create monthly_report_dispatches table
    await queryRunner.query(`
      CREATE TABLE "monthly_report_dispatches" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "report_month" character varying(7) NOT NULL,
        "recipient_id" bigint NOT NULL,
        "status" character varying(20) NOT NULL DEFAULT 'PENDING',
        "email_log_id" bigint,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_monthly_report_dispatches" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_monthly_report_dispatches_month_recipient" UNIQUE ("report_month", "recipient_id")
      )
    `);

    await queryRunner.query(
      `ALTER TABLE "monthly_report_dispatches" ADD CONSTRAINT "chk_monthly_report_dispatch_status" CHECK ("status" IN ('PENDING', 'QUEUED', 'SUCCESS', 'FAILED'))`,
    );

    // Foreign Keys for monthly_report_dispatches
    await queryRunner.query(`
      ALTER TABLE "monthly_report_dispatches"
      ADD CONSTRAINT "fk_monthly_report_email_log"
      FOREIGN KEY ("email_log_id") REFERENCES "email_logs"("id") ON DELETE SET NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "monthly_report_dispatches"
      ADD CONSTRAINT "fk_monthly_report_recipient"
      FOREIGN KEY ("recipient_id") REFERENCES "users"("id") ON DELETE RESTRICT
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "monthly_report_dispatches" DROP CONSTRAINT IF EXISTS "fk_monthly_report_recipient"`,
    );
    await queryRunner.query(
      `ALTER TABLE "monthly_report_dispatches" DROP CONSTRAINT IF EXISTS "fk_monthly_report_email_log"`,
    );
    await queryRunner.query(
      `ALTER TABLE "monthly_report_dispatches" DROP CONSTRAINT IF EXISTS "chk_monthly_report_dispatch_status"`,
    );

    await queryRunner.query(`DROP TABLE IF EXISTS "monthly_report_dispatches"`);

    await queryRunner.query(
      `ALTER TABLE "mail_outbox" DROP CONSTRAINT IF EXISTS "fk_mail_outbox_email_log"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "idx_mail_outbox_status_created_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "mail_outbox" DROP CONSTRAINT IF EXISTS "chk_mail_outbox_status"`,
    );

    await queryRunner.query(
      `DROP INDEX IF EXISTS "uq_monthly_report_recipient_month"`,
    );

    await queryRunner.query(`DROP TABLE IF EXISTS "mail_outbox"`);

    await queryRunner.query(`
      ALTER TABLE "email_logs"
      DROP CONSTRAINT IF EXISTS "fk_email_logs_recipient",
      DROP CONSTRAINT IF EXISTS "chk_email_logs_retry_generation",
      DROP COLUMN IF EXISTS "subject",
      DROP COLUMN IF EXISTS "text",
      DROP COLUMN IF EXISTS "html",
      DROP COLUMN IF EXISTS "retry_generation",
      DROP COLUMN IF EXISTS "report_month",
      DROP COLUMN IF EXISTS "recipient_user_id"
    `);

    await queryRunner.query(`
      ALTER TABLE "email_logs"
      DROP CONSTRAINT IF EXISTS "chk_email_logs_status"
    `);
    await queryRunner.query(`
      ALTER TABLE "email_logs"
      ADD CONSTRAINT "chk_email_logs_status" CHECK ("status" IN ('PENDING', 'SENT', 'FAILED'))
    `);
  }
}
