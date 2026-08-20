-- ============================================================
-- users
-- ============================================================
CREATE TABLE users (
  user_id        BIGSERIAL PRIMARY KEY,
  username       VARCHAR(50)  NOT NULL UNIQUE,
  email          VARCHAR(255) NOT NULL UNIQUE,
  password_hash  VARCHAR(255) NOT NULL,
  full_name      VARCHAR(150),
  phone          VARCHAR(20),
  avatar_url     VARCHAR(500),
  role           VARCHAR(20)  NOT NULL DEFAULT 'USER',    -- USER, ADMIN
  status         VARCHAR(20)  NOT NULL DEFAULT 'INACTIVE', -- ACTIVE, INACTIVE
  activated_at   TIMESTAMPTZ,
  created_at     TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ  NOT NULL DEFAULT now(),
  deleted_at     TIMESTAMPTZ,
  CONSTRAINT chk_users_role   CHECK (role IN ('USER','ADMIN')),
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
  room_id         BIGSERIAL PRIMARY KEY,
  room_number     VARCHAR(20) NOT NULL UNIQUE,
  name            VARCHAR(150) NOT NULL,
  room_type       VARCHAR(50),
  description     TEXT,
  price_per_night DECIMAL(10,2) NOT NULL,
  capacity        SMALLINT NOT NULL,
  view_type       VARCHAR(50),
  status          VARCHAR(20) NOT NULL DEFAULT 'ACTIVE', -- ACTIVE, INACTIVE, MAINTENANCE
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at      TIMESTAMPTZ,
  CONSTRAINT chk_rooms_status CHECK (status IN ('ACTIVE','INACTIVE','MAINTENANCE'))
);
-- NOTE: room.status is administrative (is the room offered at all);
-- actual date-by-date availability is derived from bookings, not stored here.

-- ============================================================
-- images (room photos)
-- ============================================================
CREATE TABLE images (
  image_id      BIGSERIAL PRIMARY KEY,
  room_id       BIGINT NOT NULL REFERENCES rooms(room_id),
  image_url     VARCHAR(500) NOT NULL,
  is_thumbnail  BOOLEAN NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at    TIMESTAMPTZ
);
-- enforce max one active thumbnail per room:
CREATE UNIQUE INDEX uq_images_one_thumbnail_per_room
  ON images(room_id) WHERE is_thumbnail = true AND deleted_at IS NULL;

-- ============================================================
-- amenities
-- ============================================================
CREATE TABLE amenities (
  amenity_id  BIGSERIAL PRIMARY KEY,
  name        VARCHAR(100) NOT NULL UNIQUE,
  description VARCHAR(255),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at  TIMESTAMPTZ
);

-- ============================================================
-- room_amenities (junction — simplified, no soft delete)
-- ============================================================
CREATE TABLE room_amenities (
  room_id    BIGINT NOT NULL REFERENCES rooms(room_id),
  amenity_id BIGINT NOT NULL REFERENCES amenities(amenity_id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (room_id, amenity_id)
);

-- ============================================================
-- bookings
-- ============================================================
CREATE TABLE bookings (
  booking_id       BIGSERIAL PRIMARY KEY,
  room_id          BIGINT NOT NULL REFERENCES rooms(room_id),
  user_id          BIGINT NOT NULL REFERENCES users(user_id),
  check_in_date    DATE NOT NULL,
  check_out_date   DATE NOT NULL,
  price_per_night  DECIMAL(10,2) NOT NULL,  -- snapshot at booking time
  total_price      DECIMAL(10,2) NOT NULL,
  status           VARCHAR(20) NOT NULL DEFAULT 'PENDING',
                   -- PENDING, ACCEPTED, REJECTED, CANCELLED, EXPIRED
  hold_expires_at  TIMESTAMPTZ,  -- for pay-later slot holds; NULL once paid/accepted
  note             TEXT,
  cancel_reason    TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at       TIMESTAMPTZ,
  CONSTRAINT chk_bookings_status CHECK (status IN ('PENDING','ACCEPTED','REJECTED','CANCELLED','EXPIRED')),
  CONSTRAINT chk_bookings_dates  CHECK (check_out_date > check_in_date)
);
CREATE INDEX idx_bookings_room_dates ON bookings(room_id, check_in_date, check_out_date);

-- Prevent overlapping bookings on the same room (needs btree_gist extension):
CREATE EXTENSION IF NOT EXISTS btree_gist;
ALTER TABLE bookings ADD CONSTRAINT excl_bookings_no_overlap
  EXCLUDE USING gist (
    room_id WITH =,
    daterange(check_in_date, check_out_date) WITH &&
  ) WHERE (status IN ('PENDING','ACCEPTED'));

-- ============================================================
-- payments  (1 booking : N payments — original charge + refund etc.)
-- ============================================================
CREATE TABLE payments (
  payment_id     BIGSERIAL PRIMARY KEY,
  booking_id     BIGINT NOT NULL REFERENCES bookings(booking_id),
  amount         DECIMAL(10,2) NOT NULL,
  method         VARCHAR(30) NOT NULL,  -- CASH, BANK_TRANSFER, CREDIT_CARD, VNPAY, ...
  status         VARCHAR(20) NOT NULL DEFAULT 'PENDING', -- PENDING, SUCCESS, FAILED, REFUNDED
  transaction_id VARCHAR(100),
  paid_at        TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at     TIMESTAMPTZ,
  CONSTRAINT chk_payments_status CHECK (status IN ('PENDING','SUCCESS','FAILED','REFUNDED'))
);
CREATE UNIQUE INDEX uq_payments_transaction_id
  ON payments(transaction_id) WHERE transaction_id IS NOT NULL;

-- ============================================================
-- reviews
-- ============================================================
CREATE TABLE reviews (
  review_id     BIGSERIAL PRIMARY KEY,
  booking_id    BIGINT NOT NULL UNIQUE REFERENCES bookings(booking_id), -- 1 review per booking
  room_id       BIGINT NOT NULL REFERENCES rooms(room_id),
  user_id       BIGINT NOT NULL REFERENCES users(user_id),
  rating        SMALLINT NOT NULL,
  comment       TEXT,
  delete_reason TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at    TIMESTAMPTZ,
  CONSTRAINT chk_reviews_rating CHECK (rating BETWEEN 1 AND 5)
);

-- ============================================================
-- email_logs
-- ============================================================
CREATE TABLE email_logs (
  email_id    BIGSERIAL PRIMARY KEY,
  type        VARCHAR(50) NOT NULL,
  recipient   VARCHAR(255) NOT NULL,
  status      VARCHAR(20) NOT NULL DEFAULT 'PENDING', -- PENDING, SENT, FAILED
  retry_count SMALLINT NOT NULL DEFAULT 0,
  last_error  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  sent_at     TIMESTAMPTZ,
  CONSTRAINT chk_email_logs_status CHECK (status IN ('PENDING','SENT','FAILED'))
);

-- ============================================================
-- migrations
-- ============================================================
CREATE TABLE migrations (
  migration_id BIGSERIAL PRIMARY KEY,
  name         VARCHAR(255) NOT NULL UNIQUE,
  executed_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
