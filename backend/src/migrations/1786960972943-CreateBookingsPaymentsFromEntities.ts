import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateBookingsPaymentsFromEntities1786960972943 implements MigrationInterface {
  name = 'CreateBookingsPaymentsFromEntities1786960972943';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."payments_payment_method_enum" AS ENUM('CASH', 'CREDIT_CARD', 'BANK_TRANSFER', 'E_WALLET')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."payments_status_enum" AS ENUM('PENDING', 'ACCEPTED', 'CANCELLED')`,
    );
    await queryRunner.query(
      `CREATE TABLE "payments" ("id" SERIAL NOT NULL, "booking_id" integer NOT NULL, "amount" numeric(12,2) NOT NULL, "payment_method" "public"."payments_payment_method_enum" NOT NULL, "status" "public"."payments_status_enum" NOT NULL DEFAULT 'PENDING', "transaction_code" character varying(100), "paid_at" TIMESTAMP WITH TIME ZONE, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "UQ_e86edf76dc2424f123b9023a2b2" UNIQUE ("booking_id"), CONSTRAINT "REL_e86edf76dc2424f123b9023a2b" UNIQUE ("booking_id"), CONSTRAINT "CHK_payments_amount" CHECK ("amount" >= 0), CONSTRAINT "PK_197ab7af18c93fbb0c9b28b4a59" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_payments_status" ON "payments"  ("status") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."bookings_status_enum" AS ENUM('PENDING', 'ACCEPTED', 'CANCELLED')`,
    );
    await queryRunner.query(
      `CREATE TABLE "bookings" ("id" SERIAL NOT NULL, "user_id" integer NOT NULL, "room_id" integer NOT NULL, "check_in_date" date NOT NULL, "check_out_date" date NOT NULL, "guest_count" integer NOT NULL, "total_amount" numeric(12,2) NOT NULL, "status" "public"."bookings_status_enum" NOT NULL DEFAULT 'PENDING', "special_request" text, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "CHK_bookings_total_amount" CHECK ("total_amount" >= 0), CONSTRAINT "CHK_bookings_guest_count" CHECK ("guest_count" > 0), CONSTRAINT "CHK_bookings_dates" CHECK ("check_out_date" > "check_in_date"), CONSTRAINT "PK_bee6805982cc1e248e94ce94957" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_bookings_status" ON "bookings"  ("status") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_bookings_room_id" ON "bookings"  ("room_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_bookings_user_id" ON "bookings"  ("user_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "rooms" ("id" SERIAL NOT NULL, "name" character varying(255), "description" text, "price" numeric, "capacity" integer, "createdAt" TIMESTAMP, "updatedAt" TIMESTAMP, CONSTRAINT "PK_0368a2d7c215f2d0458a54933f2" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "payments" ADD CONSTRAINT "FK_e86edf76dc2424f123b9023a2b2" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "payments" DROP CONSTRAINT "FK_e86edf76dc2424f123b9023a2b2"`,
    );
    await queryRunner.query(`DROP TABLE "rooms"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_bookings_user_id"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_bookings_room_id"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_bookings_status"`);
    await queryRunner.query(`DROP TABLE "bookings"`);
    await queryRunner.query(`DROP TYPE "public"."bookings_status_enum"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_payments_status"`);
    await queryRunner.query(`DROP TABLE "payments"`);
    await queryRunner.query(`DROP TYPE "public"."payments_status_enum"`);
    await queryRunner.query(
      `DROP TYPE "public"."payments_payment_method_enum"`,
    );
  }
}
