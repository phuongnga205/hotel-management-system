import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import AppDataSource from './data-source';

// Kiểm tra schema thực tế trên DB (DATABASE_URL) có khớp với những gì các
// migration file giả định hay không — dùng sau khi phát hiện DB thật thiếu
// "excl_bookings_no_overlap" dù CreateInitialSchema (migration đầu tiên) lẽ
// ra phải tạo ra nó (xem ExcludeBookingsIgnoreSoftDeleted). Không dùng
// `synchronize` để tự sửa vì có thể phá dữ liệu — script này chỉ BÁO CÁO,
// không tự sửa gì cả. Exit code 1 nếu có bất kỳ mục nào lệch, để dùng được
// trong CI (VD chạy định kỳ để bắt drift sớm, không chỉ khi gặp lỗi).

interface CheckResult {
  label: string;
  ok: boolean;
  detail?: string;
}

const results: CheckResult[] = [];

function record(label: string, ok: boolean, detail?: string) {
  results.push({ label, ok, detail });
}

async function main() {
  await AppDataSource.initialize();
  const ds = AppDataSource;
  const query = <T = unknown>(sql: string, params?: unknown[]): Promise<T[]> =>
    ds.query(sql, params);

  try {
    // ------------------------------------------------------------------
    // 1) Extension bắt buộc cho EXCLUDE ... USING gist trên bookings.
    // ------------------------------------------------------------------
    const [ext] = await query<{ exists: boolean }>(
      `SELECT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'btree_gist') AS exists`,
    );
    record('extension btree_gist installed', ext.exists);

    // ------------------------------------------------------------------
    // 2) Các constraint viết tay bằng raw SQL trong migration (không có
    //    decorator TypeORM tương ứng — nên KHÔNG được `synchronize` tự
    //    dựng lại nếu thiếu, là nhóm rủi ro drift cao nhất).
    // ------------------------------------------------------------------
    const expectedConstraints: Array<{
      name: string;
      table: string;
      mustContain: string[];
    }> = [
      {
        name: 'excl_bookings_no_overlap',
        table: 'bookings',
        mustContain: ['EXCLUDE', 'daterange', 'deleted_at IS NULL'],
      },
      {
        name: 'chk_bookings_dates',
        table: 'bookings',
        mustContain: ['check_out_date', 'check_in_date'],
      },
      {
        name: 'chk_bookings_status',
        table: 'bookings',
        mustContain: ['PENDING'],
      },
      { name: 'chk_users_status', table: 'users', mustContain: ['ACTIVE'] },
      { name: 'chk_users_role', table: 'users', mustContain: ['ADMIN'] },
      {
        name: 'chk_rooms_status',
        table: 'rooms',
        mustContain: ['MAINTENANCE'],
      },
      {
        name: 'chk_payments_status',
        table: 'payments',
        mustContain: ['REFUNDED'],
      },
      {
        name: 'chk_payments_amount',
        table: 'payments',
        mustContain: ['amount'],
      },
      {
        name: 'chk_email_logs_status',
        table: 'email_logs',
        mustContain: ['PENDING'],
      },
      {
        name: 'chk_email_logs_retry_count',
        table: 'email_logs',
        mustContain: ['retry_count'],
      },
      { name: 'chk_reviews_rating', table: 'reviews', mustContain: ['rating'] },
      {
        name: 'UQ_images_image_public_id',
        table: 'images',
        mustContain: ['image_public_id'],
      },
      // FK đặt tên tường minh trong migration — kiểm tra riêng (không chỉ
      // dựa vào vòng quét "unexpected" ở bước 7) để phân biệt rõ 2 tình
      // huống: (a) bị DROP hẳn và thay bằng FK_<hash> do `synchronize`
      // từng chạy nhầm (FAIL ở đây + unexpected ở bước 7), hay (b) vẫn còn
      // nguyên, chỉ có thêm 1 FK_<hash> THỪA song song (OK ở đây, nhưng
      // vẫn unexpected ở bước 7 — mới đúng nghĩa "duplicate").
      {
        name: 'FK_bookings_user',
        table: 'bookings',
        mustContain: ['user_id', 'users'],
      },
      {
        name: 'FK_bookings_room',
        table: 'bookings',
        mustContain: ['room_id', 'rooms'],
      },
      {
        name: 'FK_payments_booking',
        table: 'payments',
        mustContain: ['booking_id', 'bookings'],
      },
      {
        name: 'FK_reviews_booking',
        table: 'reviews',
        mustContain: ['booking_id', 'bookings'],
      },
      {
        name: 'FK_reviews_room',
        table: 'reviews',
        mustContain: ['room_id', 'rooms'],
      },
      {
        name: 'FK_reviews_user',
        table: 'reviews',
        mustContain: ['user_id', 'users'],
      },
      {
        name: 'FK_images_room',
        table: 'images',
        mustContain: ['room_id', 'rooms'],
      },
      {
        name: 'FK_room_amenities_room',
        table: 'room_amenities',
        mustContain: ['room_id', 'rooms'],
      },
      {
        name: 'FK_room_amenities_amenity',
        table: 'room_amenities',
        mustContain: ['amenity_id', 'amenities'],
      },
    ];

    for (const expected of expectedConstraints) {
      const rows = await query<{ def: string }>(
        `SELECT pg_get_constraintdef(oid) AS def
         FROM pg_constraint
         WHERE conname = $1 AND conrelid = $2::regclass`,
        [expected.name, `"${expected.table}"`],
      );
      if (rows.length === 0) {
        record(
          `constraint ${expected.name} on ${expected.table}`,
          false,
          'MISSING',
        );
        continue;
      }
      const def = rows[0].def;
      const missingParts = expected.mustContain.filter(
        (part) => !def.includes(part),
      );
      record(
        `constraint ${expected.name} on ${expected.table}`,
        missingParts.length === 0,
        missingParts.length
          ? `def="${def}" missing=${missingParts.join(',')}`
          : def,
      );
    }

    // ------------------------------------------------------------------
    // 3) Partial unique index viết tay (cũng không có decorator TypeORM).
    // ------------------------------------------------------------------
    const expectedIndexes = [
      'uq_images_one_thumbnail_per_room',
      'uq_payments_transaction_id',
      'idx_bookings_room_dates',
      'idx_bookings_user_id',
      'idx_bookings_room_id',
      'idx_bookings_status',
      'idx_payments_status',
      'idx_room_amenities_amenity_id',
      'idx_email_logs_status',
    ];
    for (const indexName of expectedIndexes) {
      const [row] = await query<{ exists: boolean }>(
        `SELECT EXISTS (
           SELECT 1 FROM pg_class WHERE relname = $1 AND relkind = 'i'
         ) AS exists`,
        [indexName],
      );
      record(`index ${indexName}`, row.exists);
    }

    // ------------------------------------------------------------------
    // 4) Bảng auth_tokens phải đã bị xoá (DropAuthTokensTable).
    // ------------------------------------------------------------------
    const [authTokens] = await query<{ exists: boolean }>(
      `SELECT EXISTS (
         SELECT 1 FROM information_schema.tables
         WHERE table_schema = 'public' AND table_name = 'auth_tokens'
       ) AS exists`,
    );
    record('table auth_tokens dropped', !authTokens.exists);

    // ------------------------------------------------------------------
    // 5) Cột thêm sau (AddUserProfileFieldsAndEmailLogStatusConstraint,
    //    AddImagePublicIdToImages, MakeImagePublicIdNullable).
    // ------------------------------------------------------------------
    const columnChecks: Array<{
      table: string;
      column: string;
      nullable: 'YES' | 'NO';
    }> = [
      { table: 'users', column: 'full_name', nullable: 'YES' },
      { table: 'users', column: 'activated_at', nullable: 'YES' },
      { table: 'images', column: 'image_public_id', nullable: 'YES' },
    ];
    for (const c of columnChecks) {
      const rows = await query<{ is_nullable: string }>(
        `SELECT is_nullable FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = $1 AND column_name = $2`,
        [c.table, c.column],
      );
      if (rows.length === 0) {
        record(`column ${c.table}.${c.column} exists`, false, 'MISSING');
        continue;
      }
      record(
        `column ${c.table}.${c.column} nullable=${c.nullable}`,
        rows[0].is_nullable === c.nullable,
        `actual is_nullable=${rows[0].is_nullable}`,
      );
    }

    // ------------------------------------------------------------------
    // 6) Đối chiếu migration file trên đĩa với bảng `migrations` — phát
    //    hiện migration đã record nhưng file bị xoá (orphan), hoặc file có
    //    nhưng chưa chạy (pending).
    // ------------------------------------------------------------------
    // Tên class migration = phần sau dấu "-" trong filename + timestamp ở
    // đầu, đúng convention TypeORM (VD "1787...-Foo.ts" -> "Foo1787...").
    const migrationsDir = join(__dirname, 'migrations');
    const expectedNames = readdirSync(migrationsDir)
      .filter((f) => f.endsWith('.ts') || f.endsWith('.js'))
      .map((f) => {
        const match = /^(\d+)-(.+)\.(ts|js)$/.exec(f);
        if (!match) return null;
        const [, timestamp, className] = match;
        return `${className}${timestamp}`;
      })
      .filter((v): v is string => v !== null);

    const recorded = await query<{ name: string }>(
      `SELECT name FROM migrations ORDER BY id`,
    );
    const recordedNames = new Set(recorded.map((r) => r.name));

    const pending = expectedNames.filter((n) => !recordedNames.has(n));
    const orphaned = [...recordedNames].filter(
      (n) => !expectedNames.includes(n),
    );

    record(
      'all migration files have been run',
      pending.length === 0,
      pending.length ? `pending=${pending.join(',')}` : undefined,
    );
    record(
      'no orphaned migration records (recorded but file missing)',
      orphaned.length === 0,
      orphaned.length ? `orphaned=${orphaned.join(',')}` : undefined,
    );

    // ------------------------------------------------------------------
    // 7) Quét NGƯỢC: liệt kê toàn bộ table/constraint/index thật đang có
    //    trên DB rồi trừ đi danh sách "known" (build tay từ toàn bộ
    //    migration file hiện có trong repo) — phần còn dư ra là rác từ 1
    //    migration đã từng chạy trên DB này nhưng file đã bị xoá/chưa merge
    //    (đúng kiểu bảng mail-outbox của teammate: migration bị xoá thì
    //    check #6 phát hiện được RECORD orphan trong bảng `migrations`,
    //    nhưng bảng/cột/index nó đã tạo ra trên schema thì không tự mất —
    //    bước này mới bắt được phần đó, vì #1-#5 chỉ kiểm tra "cái mình biết
    //    có tồn tại đúng không", không bắt "cái lạ không thuộc ai cả").
    //    Đây là lưới quét dạng khớp tên gần đúng — chỉ để khoanh vùng nghi
    //    vấn, không thay thế cho việc đọc kỹ nội dung migration đã xoá.
    // ------------------------------------------------------------------
    const knownTables = new Set([
      'users',
      'rooms',
      'images',
      'amenities',
      'room_amenities',
      'bookings',
      'payments',
      'reviews',
      'email_logs',
      'migrations',
    ]);
    // Tên constraint auto-đặt bởi Postgres cho PRIMARY KEY khai báo inline
    // (`"id" BIGSERIAL PRIMARY KEY`) luôn là "<table>_pkey".
    const knownConstraintsByTable: Record<string, string[]> = {
      users: [
        'users_pkey',
        'UQ_users_username',
        'UQ_users_phone',
        'UQ_users_email',
        'chk_users_status',
        'chk_users_role',
      ],
      rooms: ['rooms_pkey', 'UQ_rooms_room_number', 'chk_rooms_status'],
      images: ['images_pkey', 'FK_images_room', 'UQ_images_image_public_id'],
      amenities: ['amenities_pkey', 'UQ_amenities_name'],
      room_amenities: [
        'PK_room_amenities',
        'FK_room_amenities_room',
        'FK_room_amenities_amenity',
      ],
      bookings: [
        'bookings_pkey',
        'chk_bookings_dates',
        'chk_bookings_status',
        'FK_bookings_user',
        'FK_bookings_room',
        'excl_bookings_no_overlap',
      ],
      payments: [
        'payments_pkey',
        'chk_payments_amount',
        'chk_payments_status',
        'FK_payments_booking',
      ],
      reviews: [
        'reviews_pkey',
        'UQ_reviews_booking_id',
        'chk_reviews_rating',
        'FK_reviews_booking',
        'FK_reviews_room',
        'FK_reviews_user',
      ],
      email_logs: [
        'email_logs_pkey',
        'chk_email_logs_retry_count',
        'chk_email_logs_status',
      ],
      // KHÔNG kiểm tra bảng `migrations` ở đây: nó do TypeORM tự tạo lúc
      // chạy (không phải từ file migration nào ta viết) và đặt tên PK bằng
      // hash riêng (VD "PK_8c82d7f5..."), không theo convention
      // "<table>_pkey" — loại hẳn khỏi vòng so khớp bên dưới thay vì đoán
      // tên, tránh false positive.
    };
    // Index đứng độc lập (CREATE INDEX, không phải index tự sinh để backing
    // 1 constraint UNIQUE/PK/EXCLUDE — loại đó đã nằm trong
    // knownConstraintsByTable vì Postgres đặt index cùng tên constraint).
    const knownStandaloneIndexes = new Set(expectedIndexes);

    const actualTables = await query<{ table_name: string }>(
      `SELECT table_name FROM information_schema.tables
       WHERE table_schema = 'public' AND table_type = 'BASE TABLE'`,
    );
    const unexpectedTables = actualTables
      .map((t) => t.table_name)
      .filter((name) => !knownTables.has(name));
    record(
      'no unexpected tables on the DB',
      unexpectedTables.length === 0,
      unexpectedTables.length
        ? `unexpected=${unexpectedTables.join(',')}`
        : undefined,
    );

    const actualConstraints = await query<{
      conname: string;
      table_name: string;
      def: string;
    }>(
      `SELECT c.conname, t.relname AS table_name, pg_get_constraintdef(c.oid) AS def
       FROM pg_constraint c
       JOIN pg_class t ON t.oid = c.conrelid
       JOIN pg_namespace n ON n.oid = t.relnamespace
       WHERE n.nspname = 'public' AND c.contype <> 'n'`,
      // contype 'n' = NOT NULL constraint — Postgres (bản mới, VD Neon)
      // tự catalogue 1 constraint "<table>_<column>_not_null" cho MỌI cột
      // NOT NULL, không phải thứ ai tạo ra hay migration nào quản lý, nên
      // không tính là drift.
    );
    const unexpectedConstraints = actualConstraints.filter((c) => {
      if (c.table_name === 'migrations') return false; // do TypeORM tự quản lý, không đoán tên
      if (!knownTables.has(c.table_name)) return false; // đã báo ở bảng lạ rồi, khỏi lặp lại
      const known = knownConstraintsByTable[c.table_name] ?? [];
      return !known.includes(c.conname);
    });
    // Với mỗi constraint lạ, so định nghĩa (bỏ qua tên) với các constraint
    // đã biết trên CÙNG bảng — nếu khớp y hệt, gần như chắc chắn là bản
    // trùng lặp do ai đó từng chạy `synchronize: true` nhắm vào DB này
    // (TypeORM không nhận ra FK đã tồn tại vì tên khác, nên tạo thêm 1 cái
    // FK_<hash> cùng chức năng thay vì dùng lại).
    const unexpectedConstraintDetails = unexpectedConstraints.map((c) => {
      const knownNamesOnTable = knownConstraintsByTable[c.table_name] ?? [];
      const duplicateOf = actualConstraints.find(
        (other) =>
          other.table_name === c.table_name &&
          knownNamesOnTable.includes(other.conname) &&
          other.def === c.def,
      );
      const verdict = duplicateOf
        ? `DUPLICATE of "${duplicateOf.conname}"`
        : 'no matching known constraint — investigate';
      return `${c.conname}(${c.table_name}): ${c.def} [${verdict}]`;
    });
    record(
      'no unexpected constraints on known tables',
      unexpectedConstraints.length === 0,
      unexpectedConstraintDetails.length
        ? unexpectedConstraintDetails.join(' | ')
        : undefined,
    );

    const actualIndexes = await query<{
      indexname: string;
      tablename: string;
    }>(
      `SELECT indexname, tablename FROM pg_indexes WHERE schemaname = 'public'`,
    );
    const unexpectedIndexes = actualIndexes.filter((idx) => {
      if (idx.tablename === 'migrations') return false; // do TypeORM tự quản lý, không đoán tên
      if (!knownTables.has(idx.tablename)) return false;
      const knownForTable = knownConstraintsByTable[idx.tablename] ?? [];
      // Index backing 1 constraint có cùng tên với constraint đó.
      if (knownForTable.includes(idx.indexname)) return false;
      if (knownStandaloneIndexes.has(idx.indexname)) return false;
      return true;
    });
    record(
      'no unexpected indexes on known tables',
      unexpectedIndexes.length === 0,
      unexpectedIndexes.length
        ? `unexpected=${unexpectedIndexes
            .map((i) => `${i.indexname}(${i.tablename})`)
            .join(',')}`
        : undefined,
    );

    // ------------------------------------------------------------------
    // Report
    // ------------------------------------------------------------------
    const failed = results.filter((r) => !r.ok);
    for (const r of results) {
      console.log(
        `[${r.ok ? 'OK  ' : 'FAIL'}] ${r.label}${r.detail ? ` — ${r.detail}` : ''}`,
      );
    }
    console.log(
      `\n${results.length - failed.length}/${results.length} checks passed.`,
    );

    await ds.destroy();
    process.exit(failed.length === 0 ? 0 : 1);
  } catch (error: unknown) {
    console.error({ message: 'db-schema-check failed', error });
    await ds.destroy().catch(() => undefined);
    process.exit(1);
  }
}

void main();
