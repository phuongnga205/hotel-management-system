# Pull 4: Huong dan test

## Muc tieu

Pull 4 tu dong tong hop doanh thu cua thang hien tai va gui bao cao cho admin vao ngay cuoi thang. He thong dung `email_logs`, `mail_outbox`, `monthly_report_dispatches` va BullMQ de dam bao idempotency va giao email an toan.

## Test tu dong

Chay tu thu muc `backend`:

```bash
npm run build
npm test -- --runInBand --passWithNoTests
E2E_DATABASE_DESTRUCTIVE_ACK=hotel-management-e2e-only npm run test:e2e -- --runInBand
```

E2E can Redis tai `localhost:6379` va database test rieng co ten ket thuc bang `_e2e`. Khong dung database production cho E2E. Truoc khi chay, dat bien xac nhan an toan:

```env
E2E_DATABASE_DESTRUCTIVE_ACK=hotel-management-e2e-only
E2E_DATABASE_SSL_ENABLED=false
```

## Test cron local

De test cron ma khong doi cau hinh production, tam sua `.env`:

```env
REPORT_CRON="* * * * *"
```

Sau khi sua `.env`, restart backend vi Nest watch khong tu dong reload `.env`:

```bash
Ctrl+C
npm run start:dev
```

## Test gui mail trong 1 phut

Muc nay chi dung de test local, khong dung cau hinh nay cho production.

1. Dam bao `.env` co SMTP that, Redis dang chay va `DATABASE_URL` tro den branch test.
2. Tam thoi dat cron sau trong `.env`:

```env
REPORT_CRON="* * * * *"
```

`REPORT_CRON="* * * * *"` cho cron chay moi phut, nhung service van chi gui
dung ngay cuoi thang theo `REPORT_TIME_ZONE`. Lan chay dau tien se tao email log va outbox;
cac lan sau khong gui trung cho cung admin nho idempotency theo `reportMonth`.

3. Khoi dong Redis va chay migration:

```bash
redis-server --daemonize yes
redis-cli ping
NODE_ENV=test DATABASE_URL="URL_BRANCH_TEST" npm run migration:run
```

4. Khoi dong backend:

```bash
npm run start:dev
```

Cho toi da 1 phut, sau do kiem tra log backend co cac dong:

```text
[ReportsService] Generating monthly report for YYYY-MM...
[ReportsService] Monthly report for YYYY-MM queued successfully to N admins.
```

5. Kiem tra email trong database test:

```sql
SELECT id, type, recipient, status, retry_count, subject, created_at
FROM email_logs
WHERE type = 'monthly-report'
ORDER BY id DESC;
```

`PENDING` nghia la email dang cho xu ly, `SENT` nghia la SMTP gui thanh cong,
`FAILED` nghia la gui that bai sau khi retry, `DELIVERED_UNCONFIRMED` nghia
la SMTP da chap nhan email nhung he thong phai reconcile lai trang thai.

6. Sau khi test xong, khoi phuc `.env`:

```env
REPORT_CRON="55 23 28-31 * *"
REPORT_TIME_ZONE="Asia/Ho_Chi_Minh"
```

Restart backend sau khi doi bien moi truong.

Production mac dinh danh thuc luc 23:55 cac ngay 28-31 theo
`REPORT_TIME_ZONE`; service kiem tra va chi gui vao ngay cuoi cung cua thang.
De test noi dung bao cao, dung E2E voi `ReportClock` gia lap ngay cuoi thang.

Log thanh cong mong doi:

```text
[ReportsService] Generating monthly report for YYYY-MM...
[ReportsService] Monthly report for YYYY-MM queued successfully to N admins.
```

Kiem tra email log:

```sql
SELECT id, type, recipient, status, retry_count, subject, created_at
FROM email_logs
WHERE type = 'monthly-report'
ORDER BY id DESC;
```

Chay cron nhieu lan trong cung thang khong duoc tao email trung cho cung admin. Day la kiem tra idempotency.

## Redis va SMTP

Redis phai dang chay:

```bash
redis-server
```

Kiem tra `email_logs.status`:

- `PENDING`: da tao log, dang cho worker.
- `SENT`: SMTP gui thanh cong.
- `FAILED`: gui that bai sau retry.
- `DELIVERED_UNCONFIRMED`: SMTP da chap nhan, dang cho reconciliation.

## Khoi phuc cau hinh chuan

Truoc khi commit/push, `.env` phai tro ve:

```env
REPORT_CRON="55 23 28-31 * *"
REPORT_TIME_ZONE="Asia/Ho_Chi_Minh"
```

File `.env` duoc gitignore, khong commit database URL, SMTP password hoac JWT secret.

## Tao mot commit va push

Tu thu muc repository root:

```bash
git status
git diff --check
git add -A backend
git diff --cached --check
git diff --cached --stat
git status --short
```

Xac nhan `.env` khong nam trong staged files, sau do tao mot commit:

```bash
git commit -m "feat: add monthly report cron and e2e tests"
```

Kiem tra branch va push:

```bash
git branch --show-current
git push -u origin feature/monthly-report
```

Neu branch da tracking remote, co the dung `git push`.

## Luu y test hien tai

Neu full unit test con fail o Auth/Bookings, ghi ro do la test ngoai pham vi Pull 4. Khong sua cac test do chi de lam xanh Pull 4.
