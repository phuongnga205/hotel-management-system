import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateInitialSchema1787060046910 implements MigrationInterface {
  name = 'CreateInitialSchema1787060046910';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS btree_gist`);

    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" BIGSERIAL PRIMARY KEY,
        "username" varchar(50) NOT NULL,
        "phone" varchar(20),
        "email" varchar(255) NOT NULL,
        "password_hash" varchar(255) NOT NULL,
        "status" varchar(20) NOT NULL DEFAULT 'INACTIVE',
        "avatar_url" varchar(500),
        "role" varchar(20) NOT NULL DEFAULT 'USER',
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz,
        CONSTRAINT "UQ_users_username" UNIQUE ("username"),
        CONSTRAINT "UQ_users_phone" UNIQUE ("phone"),
        CONSTRAINT "UQ_users_email" UNIQUE ("email"),
        CONSTRAINT "chk_users_status" CHECK ("status" IN ('ACTIVE','INACTIVE')),
        CONSTRAINT "chk_users_role" CHECK ("role" IN ('USER','ADMIN'))
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "auth_tokens" (
        "id" BIGSERIAL PRIMARY KEY,
        "user_id" bigint NOT NULL,
        "type" varchar(30) NOT NULL,
        "token_hash" varchar(255) NOT NULL,
        "expires_at" timestamptz NOT NULL,
        "used_at" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_auth_tokens_token_hash" UNIQUE ("token_hash"),
        CONSTRAINT "chk_auth_tokens_type" CHECK ("type" IN ('EMAIL_VERIFICATION','PASSWORD_RESET')),
        CONSTRAINT "FK_auth_tokens_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_auth_tokens_user" ON "auth_tokens" ("user_id")`,
    );

    await queryRunner.query(`
      CREATE TABLE "rooms" (
        "id" BIGSERIAL PRIMARY KEY,
        "room_number" varchar(20) NOT NULL,
        "name" varchar(150) NOT NULL,
        "room_type" varchar(50),
        "description" text,
        "view_type" varchar(50),
        "capacity" smallint NOT NULL,
        "price_per_night" decimal(10,2) NOT NULL,
        "status" varchar(20) NOT NULL DEFAULT 'ACTIVE',
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz,
        CONSTRAINT "UQ_rooms_room_number" UNIQUE ("room_number"),
        CONSTRAINT "chk_rooms_status" CHECK ("status" IN ('ACTIVE','INACTIVE','MAINTENANCE'))
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "images" (
        "id" BIGSERIAL PRIMARY KEY,
        "room_id" bigint NOT NULL,
        "image_url" varchar(500) NOT NULL,
        "is_thumbnail" boolean NOT NULL DEFAULT false,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz,
        CONSTRAINT "FK_images_room" FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "uq_images_one_thumbnail_per_room" ON "images" ("room_id")
      WHERE "is_thumbnail" = true AND "deleted_at" IS NULL
    `);

    await queryRunner.query(`
      CREATE TABLE "amenities" (
        "id" BIGSERIAL PRIMARY KEY,
        "name" varchar(100) NOT NULL,
        "description" varchar(255),
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz,
        CONSTRAINT "UQ_amenities_name" UNIQUE ("name")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "room_amenities" (
        "room_id" bigint NOT NULL,
        "amenity_id" bigint NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_room_amenities" PRIMARY KEY ("room_id", "amenity_id"),
        CONSTRAINT "FK_room_amenities_room" FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_room_amenities_amenity" FOREIGN KEY ("amenity_id") REFERENCES "amenities"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "bookings" (
        "id" BIGSERIAL PRIMARY KEY,
        "user_id" bigint NOT NULL,
        "room_id" bigint NOT NULL,
        "check_in_date" date NOT NULL,
        "check_out_date" date NOT NULL,
        "price_per_night" decimal(10,2) NOT NULL,
        "total_price" decimal(10,2) NOT NULL,
        "status" varchar(20) NOT NULL DEFAULT 'PENDING',
        "hold_expires_at" timestamptz,
        "note" text,
        "cancel_reason" text,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz,
        CONSTRAINT "chk_bookings_dates" CHECK ("check_out_date" > "check_in_date"),
        CONSTRAINT "chk_bookings_status" CHECK ("status" IN ('PENDING','ACCEPTED','REJECTED','CANCELLED','EXPIRED')),
        CONSTRAINT "FK_bookings_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_bookings_room" FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_bookings_user_id" ON "bookings" ("user_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_bookings_room_id" ON "bookings" ("room_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_bookings_status" ON "bookings" ("status")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_bookings_room_dates" ON "bookings" ("room_id", "check_in_date", "check_out_date")`,
    );
    // Race-condition guard: no two PENDING/ACCEPTED bookings may hold
    // overlapping date ranges on the same room. TypeORM has no decorator
    // for EXCLUDE constraints, so this is hand-written.
    await queryRunner.query(`
      ALTER TABLE "bookings" ADD CONSTRAINT "excl_bookings_no_overlap"
      EXCLUDE USING gist (
        "room_id" WITH =,
        daterange("check_in_date", "check_out_date") WITH &&
      ) WHERE ("status" IN ('PENDING','ACCEPTED'))
    `);

    await queryRunner.query(`
      CREATE TABLE "payments" (
        "id" BIGSERIAL PRIMARY KEY,
        "booking_id" bigint NOT NULL,
        "amount" decimal(10,2) NOT NULL,
        "method" varchar(30) NOT NULL,
        "status" varchar(20) NOT NULL DEFAULT 'PENDING',
        "transaction_id" varchar(100),
        "paid_at" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz,
        CONSTRAINT "chk_payments_amount" CHECK ("amount" >= 0),
        CONSTRAINT "chk_payments_status" CHECK ("status" IN ('PENDING','SUCCESS','FAILED','REFUNDED')),
        CONSTRAINT "FK_payments_booking" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_payments_status" ON "payments" ("status")`,
    );
    await queryRunner.query(`
      CREATE UNIQUE INDEX "uq_payments_transaction_id" ON "payments" ("transaction_id")
      WHERE "transaction_id" IS NOT NULL
    `);

    await queryRunner.query(`
      CREATE TABLE "reviews" (
        "id" BIGSERIAL PRIMARY KEY,
        "booking_id" bigint NOT NULL,
        "room_id" bigint NOT NULL,
        "user_id" bigint NOT NULL,
        "rating" smallint NOT NULL,
        "comment" text,
        "delete_reason" text,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz,
        CONSTRAINT "UQ_reviews_booking_id" UNIQUE ("booking_id"),
        CONSTRAINT "chk_reviews_rating" CHECK ("rating" BETWEEN 1 AND 5),
        CONSTRAINT "FK_reviews_booking" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_reviews_room" FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_reviews_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "email_logs" (
        "id" BIGSERIAL PRIMARY KEY,
        "type" varchar(50) NOT NULL,
        "recipient" varchar(255) NOT NULL,
        "status" varchar(20) NOT NULL,
        "retry_count" smallint NOT NULL DEFAULT 0,
        "last_error" text,
        "sent_at" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "chk_email_logs_retry_count" CHECK ("retry_count" >= 0)
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_email_logs_status" ON "email_logs" ("status")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "email_logs"`);
    await queryRunner.query(`DROP TABLE "reviews"`);
    await queryRunner.query(`DROP TABLE "payments"`);
    await queryRunner.query(`DROP TABLE "bookings"`);
    await queryRunner.query(`DROP TABLE "room_amenities"`);
    await queryRunner.query(`DROP TABLE "amenities"`);
    await queryRunner.query(`DROP TABLE "images"`);
    await queryRunner.query(`DROP TABLE "rooms"`);
    await queryRunner.query(`DROP TABLE "auth_tokens"`);
    await queryRunner.query(`DROP TABLE "users"`);
  }
}
