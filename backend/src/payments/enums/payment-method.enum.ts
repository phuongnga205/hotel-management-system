// Cột `payments.method` là varchar, không phải Postgres enum — nên dùng
// type + const object thay vì TS `enum`, khớp đúng bản chất cột DB.
export type PaymentMethod = 'CASH' | 'BANK_TRANSFER' | 'CREDIT_CARD' | 'VNPAY';
export const PaymentMethod = {
  CASH: 'CASH',
  BANK_TRANSFER: 'BANK_TRANSFER',
  CREDIT_CARD: 'CREDIT_CARD',
  VNPAY: 'VNPAY',
} as const satisfies Record<string, PaymentMethod>;
