// Cột `payments.status` là varchar + CHECK, không phải Postgres enum — nên
// dùng type + const object thay vì TS `enum`, khớp đúng bản chất cột DB
// (xem @Check ở payment.entity.ts).
export type PaymentStatus = 'PENDING' | 'SUCCESS' | 'FAILED' | 'REFUNDED';
export const PaymentStatus = {
  PENDING: 'PENDING',
  SUCCESS: 'SUCCESS',
  FAILED: 'FAILED',
  REFUNDED: 'REFUNDED',
} as const satisfies Record<string, PaymentStatus>;
