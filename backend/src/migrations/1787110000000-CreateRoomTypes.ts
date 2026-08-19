import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateRoomTypes1787110000000 implements MigrationInterface {
  name = 'CreateRoomTypes1787110000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "room_types" (
        "id" BIGSERIAL PRIMARY KEY,
        "name" varchar(100) NOT NULL,
        "description" text,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz,
        CONSTRAINT "UQ_room_types_name" UNIQUE ("name")
      )
    `);
    await queryRunner.query(`
      INSERT INTO "room_types" ("name")
      SELECT DISTINCT COALESCE(NULLIF(TRIM("room_type"), ''), 'Standard')
      FROM "rooms"
      ON CONFLICT ("name") DO NOTHING
    `);
    await queryRunner.query(`
      INSERT INTO "room_types" ("name") VALUES ('Standard')
      ON CONFLICT ("name") DO NOTHING
    `);
    await queryRunner.query(`ALTER TABLE "rooms" ADD "room_type_id" bigint`);
    await queryRunner.query(`
      UPDATE "rooms" AS room
      SET "room_type_id" = room_type."id"
      FROM "room_types" AS room_type
      WHERE room_type."name" = COALESCE(NULLIF(TRIM(room."room_type"), ''), 'Standard')
    `);
    await queryRunner.query(
      `ALTER TABLE "rooms" ALTER COLUMN "room_type_id" SET NOT NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_rooms_room_type_id" ON "rooms" ("room_type_id")`,
    );
    await queryRunner.query(`
      ALTER TABLE "rooms"
      ADD CONSTRAINT "FK_rooms_room_type"
      FOREIGN KEY ("room_type_id") REFERENCES "room_types"("id")
      ON DELETE RESTRICT
    `);
    await queryRunner.query(`ALTER TABLE "rooms" DROP COLUMN "room_type"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "rooms" ADD "room_type" varchar(50)`);
    await queryRunner.query(`
      UPDATE "rooms" AS room
      SET "room_type" = room_type."name"
      FROM "room_types" AS room_type
      WHERE room."room_type_id" = room_type."id"
    `);
    await queryRunner.query(
      `ALTER TABLE "rooms" DROP CONSTRAINT "FK_rooms_room_type"`,
    );
    await queryRunner.query(`DROP INDEX "idx_rooms_room_type_id"`);
    await queryRunner.query(`ALTER TABLE "rooms" DROP COLUMN "room_type_id"`);
    await queryRunner.query(`DROP TABLE "room_types"`);
  }
}
