import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMailOutboxAndReports1787308765309 implements MigrationInterface {
  name = 'AddMailOutboxAndReports1787308765309';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add columns to email_logs
    await queryRunner.query(`
      ALTER TABLE "email_logs"
      ADD "recipient_user_id" bigint,
      ADD "report_month" character varying(7),
      ADD "retry_generation" integer NOT NULL DEFAULT 0,
      ADD "html" text,
      ADD "text" text,
      ADD "subject" character varying(255)
    `);

    // Create mail_outbox table
    await queryRunner.query(`
      CREATE TABLE "mail_outbox" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "email_log_id" bigint NOT NULL,
        "payload" jsonb NOT NULL,
        "status" character varying(20) NOT NULL DEFAULT 'PENDING',
        "attempt_count" integer NOT NULL DEFAULT 0,
        "next_attempt_at" TIMESTAMP WITH TIME ZONE,
        "locked_at" TIMESTAMP WITH TIME ZONE,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_mail_outbox" PRIMARY KEY ("id")
      )
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

    await queryRunner.query(
      `ALTER TABLE "mail_outbox" ADD CONSTRAINT "chk_mail_outbox_status" CHECK ("status" IN ('PENDING', 'PROCESSING', 'PROCESSED', 'FAILED'))`,
    );

    // Foreign Key for emailLogId
    await queryRunner.query(`
      ALTER TABLE "monthly_report_dispatches"
      ADD CONSTRAINT "fk_monthly_report_email_log"
      FOREIGN KEY ("email_log_id") REFERENCES "email_logs"("id") ON DELETE SET NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "monthly_report_dispatches" DROP CONSTRAINT IF EXISTS "fk_monthly_report_email_log"`,
    );
    await queryRunner.query(
      `ALTER TABLE "mail_outbox" DROP CONSTRAINT IF EXISTS "chk_mail_outbox_status"`,
    );
    await queryRunner.query(
      `ALTER TABLE "monthly_report_dispatches" DROP CONSTRAINT IF EXISTS "chk_monthly_report_dispatch_status"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "monthly_report_dispatches"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "mail_outbox"`);
    await queryRunner.query(`
      ALTER TABLE "email_logs"
      DROP COLUMN IF EXISTS "subject",
      DROP COLUMN IF EXISTS "text",
      DROP COLUMN IF EXISTS "html",
      DROP COLUMN IF EXISTS "retry_generation",
      DROP COLUMN IF EXISTS "report_month",
      DROP COLUMN IF EXISTS "recipient_user_id"
    `);
  }
}
