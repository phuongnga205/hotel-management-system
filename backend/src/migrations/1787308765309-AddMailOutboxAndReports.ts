import { MigrationInterface, QueryRunner, TableForeignKey, TableCheck } from "typeorm";

export class AddMailOutboxAndReports1787308765309 implements MigrationInterface {
    name = 'AddMailOutboxAndReports1787308765309'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "email_logs" ADD "subject" character varying(255)`);
        await queryRunner.query(`ALTER TABLE "email_logs" ADD "text" text`);
        await queryRunner.query(`ALTER TABLE "email_logs" ADD "html" text`);
        await queryRunner.query(`ALTER TABLE "mail_outbox" ADD "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`);
        await queryRunner.query(`CREATE INDEX "idx_mail_outbox_status_created_at" ON "mail_outbox" ("status", "created_at")`);

        await queryRunner.query(`ALTER TABLE "mail_outbox" DROP CONSTRAINT IF EXISTS "chk_mail_outbox_status"`);
        await queryRunner.query(`ALTER TABLE "mail_outbox" ADD CONSTRAINT "chk_mail_outbox_status" CHECK ("status" IN ('PENDING', 'PROCESSING', 'PROCESSED', 'FAILED'))`);

        await queryRunner.query(`ALTER TABLE "monthly_report_dispatches" DROP CONSTRAINT IF EXISTS "chk_monthly_report_dispatches_status"`);
        await queryRunner.query(`ALTER TABLE "monthly_report_dispatches" ADD CONSTRAINT "chk_monthly_report_dispatches_status" CHECK ("status" IN ('PENDING', 'QUEUED', 'SUCCESS', 'FAILED'))`);

        await queryRunner.query(`ALTER TABLE "mail_outbox" DROP CONSTRAINT IF EXISTS "fk_mail_outbox_email_log"`);
        await queryRunner.query(`ALTER TABLE "mail_outbox" ADD CONSTRAINT "fk_mail_outbox_email_log" FOREIGN KEY ("emailLogId") REFERENCES "email_logs"("id") ON DELETE CASCADE`);

        await queryRunner.query(`ALTER TABLE "monthly_report_dispatches" DROP CONSTRAINT IF EXISTS "fk_monthly_report_dispatches_recipient"`);
        await queryRunner.query(`ALTER TABLE "monthly_report_dispatches" ADD CONSTRAINT "fk_monthly_report_dispatches_recipient" FOREIGN KEY ("recipientId") REFERENCES "users"("id") ON DELETE CASCADE`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "monthly_report_dispatches" DROP CONSTRAINT IF EXISTS "fk_monthly_report_dispatches_recipient"`);
        await queryRunner.query(`ALTER TABLE "mail_outbox" DROP CONSTRAINT IF EXISTS "fk_mail_outbox_email_log"`);
        
        await queryRunner.query(`ALTER TABLE "monthly_report_dispatches" DROP CONSTRAINT IF EXISTS "chk_monthly_report_dispatches_status"`);
        await queryRunner.query(`ALTER TABLE "monthly_report_dispatches" ADD CONSTRAINT "chk_monthly_report_dispatches_status" CHECK ("status" IN ('PENDING', 'SUCCESS', 'FAILED'))`);
        
        await queryRunner.query(`ALTER TABLE "mail_outbox" DROP CONSTRAINT IF EXISTS "chk_mail_outbox_status"`);
        await queryRunner.query(`ALTER TABLE "mail_outbox" ADD CONSTRAINT "chk_mail_outbox_status" CHECK ("status" IN ('PENDING', 'PROCESSED', 'FAILED'))`);
        
        await queryRunner.query(`DROP INDEX "public"."idx_mail_outbox_status_created_at"`);
        await queryRunner.query(`ALTER TABLE "mail_outbox" DROP COLUMN "created_at"`);
        await queryRunner.query(`ALTER TABLE "email_logs" DROP COLUMN "html"`);
        await queryRunner.query(`ALTER TABLE "email_logs" DROP COLUMN "text"`);
        await queryRunner.query(`ALTER TABLE "email_logs" DROP COLUMN "subject"`);
    }
}
