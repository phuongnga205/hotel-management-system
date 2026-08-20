import { MigrationInterface, QueryRunner } from 'typeorm';

// Bảng `auth_tokens` (OTP kích hoạt tài khoản + đặt lại mật khẩu) chưa từng
// được dùng thật trong code (không entity/repository nào của tính năng
// activate/forgot-password/reset-password đụng tới nó — 2 luồng đó còn
// 🚧 TODO, xem backend/docs/DANH_SACH_API.md) — quyết định chuyển hẳn sang
// lưu OTP ở Redis (`TokenUtil.saveOtp/verifyOtp/consumeOtp`, xem
// src/token/token.util.ts), nhất quán với cách JWT blacklist khi logout đã
// làm từ trước, không cần thêm 1 bảng Postgres riêng cho dữ liệu tự hết hạn.
export class DropAuthTokensTable1787166362170 implements MigrationInterface {
  name = 'DropAuthTokensTable1787166362170';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_auth_tokens_user"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "auth_tokens"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
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
  }
}
