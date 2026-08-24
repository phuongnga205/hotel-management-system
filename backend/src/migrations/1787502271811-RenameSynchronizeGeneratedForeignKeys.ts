import { MigrationInterface, QueryRunner } from 'typeorm';

// `synchronize: true` từng bị hardcode trong app.module.ts (đã tắt ở commit
// "chore: Tắt synchronize TypeORM theo yêu cầu của team") — trong giai
// đoạn đó, mỗi lần app khởi động, TypeORM không nhận diện được các FK đã
// đặt tên tường minh trong CreateInitialSchema (VD "FK_bookings_user"), nên
// DROP rồi tạo lại bằng tên hash tự sinh (VD "FK_e86edf76dc2424f123b9023a2b2").
// FK vẫn đúng cột/đúng bảng tham chiếu/đúng ON DELETE — chỉ sai TÊN.
//
// Migration này CHỈ đổi tên (RENAME CONSTRAINT), không đụng tới định nghĩa
// hay dữ liệu, nên an toàn tuyệt đối. Không hardcode tên hash cụ thể (khác
// nhau giữa các DB) — tự tìm FK theo (bảng, cột, bảng tham chiếu) rồi đổi
// về tên chuẩn. DB nào đã đúng tên sẵn (VD tạo mới hoàn toàn từ migration,
// chưa từng dính synchronize) thì bỏ qua, không lỗi.
export class RenameSynchronizeGeneratedForeignKeys1787502271811 implements MigrationInterface {
  name = 'RenameSynchronizeGeneratedForeignKeys1787502271811';

  private readonly relations: Array<{
    table: string;
    column: string;
    refTable: string;
    expectedName: string;
  }> = [
    {
      table: 'bookings',
      column: 'user_id',
      refTable: 'users',
      expectedName: 'FK_bookings_user',
    },
    {
      table: 'bookings',
      column: 'room_id',
      refTable: 'rooms',
      expectedName: 'FK_bookings_room',
    },
    {
      table: 'payments',
      column: 'booking_id',
      refTable: 'bookings',
      expectedName: 'FK_payments_booking',
    },
    {
      table: 'reviews',
      column: 'booking_id',
      refTable: 'bookings',
      expectedName: 'FK_reviews_booking',
    },
    {
      table: 'reviews',
      column: 'room_id',
      refTable: 'rooms',
      expectedName: 'FK_reviews_room',
    },
    {
      table: 'reviews',
      column: 'user_id',
      refTable: 'users',
      expectedName: 'FK_reviews_user',
    },
    {
      table: 'images',
      column: 'room_id',
      refTable: 'rooms',
      expectedName: 'FK_images_room',
    },
    {
      table: 'room_amenities',
      column: 'room_id',
      refTable: 'rooms',
      expectedName: 'FK_room_amenities_room',
    },
    {
      table: 'room_amenities',
      column: 'amenity_id',
      refTable: 'amenities',
      expectedName: 'FK_room_amenities_amenity',
    },
  ];

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const rel of this.relations) {
      const existing = (await queryRunner.query(
        `SELECT 1 FROM pg_constraint WHERE conname = $1 AND conrelid = $2::regclass`,
        [rel.expectedName, `"${rel.table}"`],
      )) as unknown[];
      if (existing.length > 0) continue;

      const matches = (await queryRunner.query(
        `SELECT c.conname
         FROM pg_constraint c
         WHERE c.conrelid = $1::regclass
           AND c.contype = 'f'
           AND c.confrelid = $2::regclass
           AND c.conkey = ARRAY[(
             SELECT attnum FROM pg_attribute
             WHERE attrelid = $1::regclass AND attname = $3
           )]::smallint[]
         LIMIT 1`,
        [`"${rel.table}"`, `"${rel.refTable}"`, rel.column],
      )) as Array<{ conname: string }>;
      const foundName = matches[0]?.conname;
      if (!foundName) continue; // không có FK nào khớp — không giả định gì thêm, để lần sau tự soát lại

      await queryRunner.query(
        `ALTER TABLE "${rel.table}" RENAME CONSTRAINT "${foundName}" TO "${rel.expectedName}"`,
      );
    }
  }

  public async down(): Promise<void> {
    // Không revert: đổi tên lại thành hash ngẫu nhiên (mà migration này
    // vốn không hề lưu lại) không có tác dụng thực tế nào — tên chuẩn theo
    // migration luôn là lựa chọn đúng cần giữ, kể cả khi rollback.
  }
}
