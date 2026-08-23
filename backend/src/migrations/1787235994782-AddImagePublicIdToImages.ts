import { MigrationInterface, QueryRunner } from 'typeorm';

// Chuẩn bị schema cho room-images qua Cloudinary (logic upload/xoá thật sẽ
// làm ở PR sau — xem ghi chú "Admin — Room Images" trong
// backend/docs/DANH_SACH_API.md). Khác với users.avatar_url (1 slot cố định
// suy ra được public_id từ userId, không cần lưu), 1 phòng có N ảnh nên
// bắt buộc lưu public_id riêng cho từng dòng để biết xoá đúng asset nào
// trên Cloudinary. Bảng `images` hiện chưa được dùng ở bất kỳ flow thật nào
// (ImagesModule mới chỉ là scaffold), nên an toàn để thêm cột NOT NULL mà
// không cần DEFAULT/backfill.
export class AddImagePublicIdToImages1787235994782 implements MigrationInterface {
  name = 'AddImagePublicIdToImages1787235994782';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "images" ADD COLUMN "image_public_id" varchar(255) NOT NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "images" ADD CONSTRAINT "UQ_images_image_public_id"
      UNIQUE ("image_public_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "images" DROP CONSTRAINT "UQ_images_image_public_id"
    `);
    await queryRunner.query(`
      ALTER TABLE "images" DROP COLUMN "image_public_id"
    `);
  }
}
