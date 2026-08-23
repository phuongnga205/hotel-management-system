import { MigrationInterface, QueryRunner } from 'typeorm';

export class MakeImagePublicIdNullable1787241439521 implements MigrationInterface {
  name = 'MakeImagePublicIdNullable1787241439521';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "images" ALTER COLUMN "image_public_id" DROP NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "images" ALTER COLUMN "image_public_id" SET NOT NULL
    `);
  }
}
