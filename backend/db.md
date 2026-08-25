-- ============================================================
-- users
-- ============================================================
CREATE TABLE users (
user_id BIGSERIAL PRIMARY KEY,
username VARCHAR(50) NOT NULL UNIQUE,
email VARCHAR(255) NOT NULL UNIQUE,
password_hash VARCHAR(255) NOT NULL,
full_name VARCHAR(150),
phone VARCHAR(20) UNIQUE,
avatar_url VARCHAR(500),
role VARCHAR(20) NOT NULL DEFAULT 'USER', -- USER, ADMIN
status VARCHAR(20) NOT NULL DEFAULT 'INACTIVE', -- ACTIVE, INACTIVE
activated_at TIMESTAMPTZ,
created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
deleted_at TIMESTAMPTZ,
CONSTRAINT chk_users_role CHECK (role IN ('USER','ADMIN')),
CONSTRAINT chk_users_status CHECK (status IN ('ACTIVE','INACTIVE'))
);

-- ============================================================
-- auth_tokens — ĐÃ XOÁ (migration DropAuthTokensTable), KHÔNG dùng Postgres
-- ============================================================
-- OTP kích hoạt tài khoản (EMAIL_VERIFICATION) và đặt lại mật khẩu
-- (PASSWORD_RESET) lưu ở Redis, không phải bảng riêng — dữ liệu tự hết hạn
-- (TTL) nên không cần persist ở Postgres, nhất quán với cách JWT blacklist
-- khi logout đã làm từ trước. Xem `src/token/token.util.ts`
-- (`saveOtp`/`verifyOtp`/`consumeOtp`) và `src/token/redis.util.ts`.

-- ============================================================
-- rooms
-- ============================================================
CREATE TABLE rooms (
room_id BIGSERIAL PRIMARY KEY,
room_number VARCHAR(20) NOT NULL UNIQUE,
name VARCHAR(150) NOT NULL,
room_type VARCHAR(50),
description TEXT,
price_per_night DECIMAL(10,2) NOT NULL,
capacity SMALLINT NOT NULL,
view_type VARCHAR(50),
status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE', -- ACTIVE, INACTIVE, MAINTENANCE
created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
deleted_at TIMESTAMPTZ,
CONSTRAINT chk_rooms_status CHECK (status IN ('ACTIVE','INACTIVE','MAINTENANCE'))
);
-- NOTE: room.status is administrative (is the room offered at all);
-- actual date-by-date availability is derived from bookings, not stored here.

-- ============================================================
-- images (room photos)
-- ============================================================
CREATE TABLE images (
image_id BIGSERIAL PRIMARY KEY,
room_id BIGINT NOT NULL REFERENCES rooms(room_id),
image_url VARCHAR(500) NOT NULL,
image_public_id VARCHAR(255) UNIQUE, -- Cloudinary public_id (nullable), xem migration MakeImagePublicIdNullable
is_thumbnail BOOLEAN NOT NULL DEFAULT false,
created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
deleted_at TIMESTAMPTZ
);
-- enforce max one active thumbnail per room:
CREATE UNIQUE INDEX uq_images_one_thumbnail_per_room
ON images(room_id) WHERE is_thumbnail = true AND deleted_at IS NULL;

-- NOTE: image_public_id là public_id trên Cloudinary. RoomsService.addImage()
-- (xem backend/src/rooms/rooms.service.ts) giờ luôn upload ảnh phòng lên
-- Cloudinary (đồng bộ cách avatar user đang lưu) và set cột này cho MỌI ảnh
-- mới — không còn lưu file trên local disk nữa (đã bỏ ROOM_UPLOAD_DIRECTORY).
-- Cột vẫn để nullable (không đổi lại NOT NULL) vì DB Neon dùng chung có thể
-- còn sót vài dòng cũ từ giai đoạn lưu local disk (image_public_id = NULL,
-- image_url trỏ về path cục bộ đã không còn phục vụ) — cần dọn/backfill dữ
-- liệu cũ đó trước khi siết lại NOT NULL, chưa làm ở migration này.

-- ============================================================
-- amenities
-- ============================================================
CREATE TABLE amenities (
amenity_id BIGSERIAL PRIMARY KEY,
name VARCHAR(100) NOT NULL UNIQUE,
description VARCHAR(255),
created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
deleted_at TIMESTAMPTZ
);

-- ============================================================
-- room_amenities (junction — simplified, no soft delete)
-- ============================================================
CREATE TABLE room_amenities (
room_id BIGINT NOT NULL REFERENCES rooms(room_id),
amenity_id BIGINT NOT NULL REFERENCES amenities(amenity_id),
created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
PRIMARY KEY (room_id, amenity_id)
);

-- ============================================================
-- bookings
-- ============================================================
CREATE TABLE bookings (
booking_id BIGSERIAL PRIMARY KEY,
room_id BIGINT NOT NULL REFERENCES rooms(room_id),
user_id BIGINT NOT NULL REFERENCES users(user_id),
check_in_date DATE NOT NULL,
check_out_date DATE NOT NULL,
guests SMALLINT NOT NULL DEFAULT 1, -- so khach, bat buoc khi tao (POST /bookings), co dinh sau khi tao - validate <= rooms.capacity o service (migration AddGuestsToBookings)
price_per_night DECIMAL(10,2) NOT NULL, -- snapshot at booking time
total_price DECIMAL(10,2) NOT NULL, -- = nights * price_per_night * guests
status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
-- PENDING, ACCEPTED, REJECTED, CANCELLED, EXPIRED
hold_expires_at TIMESTAMPTZ, -- for pay-later slot holds; NULL once paid/accepted
note TEXT,
cancel_reason TEXT,
created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
deleted_at TIMESTAMPTZ,
CONSTRAINT chk_bookings_status CHECK (status IN ('PENDING','ACCEPTED','REJECTED','CANCELLED','EXPIRED')),
CONSTRAINT chk_bookings_dates CHECK (check_out_date > check_in_date),
CONSTRAINT chk_bookings_guests CHECK (guests > 0)
);
CREATE INDEX idx_bookings_room_dates ON bookings(room_id, check_in_date, check_out_date);

-- Prevent overlapping bookings on the same room (needs btree_gist extension):
CREATE EXTENSION IF NOT EXISTS btree_gist;
ALTER TABLE bookings ADD CONSTRAINT excl_bookings_no_overlap
EXCLUDE USING gist (
room_id WITH =,
daterange(check_in_date, check_out_date) WITH &&
) WHERE (status IN ('PENDING','ACCEPTED') AND deleted_at IS NULL);
-- deleted_at IS NULL thêm ở migration ExcludeBookingsIgnoreSoftDeleted
-- (sau CreateInitialSchema) — nếu không có điều kiện này, 1 booking
-- PENDING/ACCEPTED đã bị soft-delete vẫn tiếp tục chặn EXCLUDE constraint,
-- khiến phòng/ngày đó không thể đặt lại dù ứng dụng coi booking đó không
-- còn tồn tại.

-- ============================================================
-- payments (1 booking : N payments — original charge + refund etc.)
-- ============================================================
CREATE TABLE payments (
payment_id BIGSERIAL PRIMARY KEY,
booking_id BIGINT NOT NULL REFERENCES bookings(booking_id),
amount DECIMAL(10,2) NOT NULL,
method VARCHAR(30) NOT NULL, -- CASH, BANK_TRANSFER, CREDIT_CARD, VNPAY, ...
status VARCHAR(20) NOT NULL DEFAULT 'PENDING', -- PENDING, SUCCESS, FAILED, REFUNDED
transaction_id VARCHAR(100),
paid_at TIMESTAMPTZ,
created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
deleted_at TIMESTAMPTZ,
CONSTRAINT chk_payments_status CHECK (status IN ('PENDING','SUCCESS','FAILED','REFUNDED'))
);
CREATE UNIQUE INDEX uq_payments_transaction_id
ON payments(transaction_id) WHERE transaction_id IS NOT NULL;

-- ============================================================
-- reviews
-- ============================================================
CREATE TABLE reviews (
review_id BIGSERIAL PRIMARY KEY,
booking_id BIGINT NOT NULL UNIQUE REFERENCES bookings(booking_id), -- 1 review per booking
room_id BIGINT NOT NULL REFERENCES rooms(room_id),
user_id BIGINT NOT NULL REFERENCES users(user_id),
rating SMALLINT NOT NULL,
comment TEXT,
delete_reason TEXT,
created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
deleted_at TIMESTAMPTZ,
CONSTRAINT chk_reviews_rating CHECK (rating BETWEEN 1 AND 5)
);

-- ============================================================
-- email_logs
-- ============================================================
CREATE TABLE email_logs (
id BIGSERIAL PRIMARY KEY,
type VARCHAR(50) NOT NULL,
recipient VARCHAR(255) NOT NULL,
status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
retry_count SMALLINT NOT NULL DEFAULT 0,
retry_generation INTEGER NOT NULL DEFAULT 0,
last_error TEXT,
subject VARCHAR(255) NOT NULL,
text TEXT NOT NULL,
html TEXT,
report_month VARCHAR(7),
recipient_user_id BIGINT REFERENCES users(user_id) ON DELETE SET NULL,
created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
sent_at TIMESTAMPTZ,
CONSTRAINT chk_email_logs_status CHECK (status IN ('PENDING','SENT','FAILED','DELIVERED_UNCONFIRMED')),
CONSTRAINT chk_email_logs_retry_count CHECK (retry_count >= 0),
CONSTRAINT chk_email_logs_retry_generation CHECK (retry_generation >= 0)
);
CREATE UNIQUE INDEX uq_monthly_report_recipient_month
ON email_logs(report_month, recipient_user_id)
WHERE type = 'monthly-report' AND report_month IS NOT NULL AND recipient_user_id IS NOT NULL;

-- OTP kích hoạt tài khoản và đặt lại mật khẩu KHÔNG lưu trong PostgreSQL.
-- Redis key: otp:<EMAIL_VERIFICATION|PASSWORD_RESET>:<userId>, TTL lấy từ
-- OTP_TTL_SECONDS (mặc định 600 giây). OTP bị xoá sau khi dùng thành công.

-- Transactional outbox: persisted in the same transaction as email_logs.
CREATE TABLE mail_outbox (
id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
email_log_id BIGINT NOT NULL REFERENCES email_logs(id) ON DELETE CASCADE,
payload JSONB NOT NULL,
status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
attempt_count SMALLINT NOT NULL DEFAULT 0,
next_attempt_at TIMESTAMPTZ,
locked_at TIMESTAMPTZ,
created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
CONSTRAINT chk_mail_outbox_status CHECK (status IN ('PENDING','PROCESSING','PROCESSED','FAILED'))
);
CREATE INDEX idx_mail_outbox_status_created_at ON mail_outbox(status, created_at);

CREATE TABLE monthly_report_dispatches (
id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
report_month VARCHAR(7) NOT NULL,
recipient_id BIGINT NOT NULL REFERENCES users(user_id) ON DELETE RESTRICT,
status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
email_log_id BIGINT REFERENCES email_logs(id) ON DELETE SET NULL,
created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
CONSTRAINT uq_monthly_report_dispatch UNIQUE (report_month, recipient_id),
CONSTRAINT chk_monthly_report_dispatch_status CHECK (status IN ('PENDING','QUEUED','SUCCESS','FAILED'))
);

-- ============================================================
-- migrations
-- ============================================================
CREATE TABLE migrations (
migration_id BIGSERIAL PRIMARY KEY,
name VARCHAR(255) NOT NULL UNIQUE,
executed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
