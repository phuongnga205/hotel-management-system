import { StatisticsPeriod } from './enums/statistics-period.enum';
import { BookingStatus } from '../bookings/enums/booking-status.enum';
import { PaymentStatus } from '../payments/enums/payment-status.enum';

export const STATISTICS = {
  CACHE_KEY_PREFIX: 'statistics:revenue-bookings:v1',
  CACHE_LOCK_SUFFIX: 'lock',
  DEFAULT_CACHE_TTL_SECONDS: 300,
  LOCK_TTL_SECONDS: 15,
  LOCK_RENEW_INTERVAL_MILLISECONDS: 5_000,
  CACHE_WAIT_INTERVAL_MILLISECONDS: 100,
  MILLISECONDS_PER_SECOND: 1_000,
  DEFAULT_TIME_ZONE: 'Asia/Ho_Chi_Minh',
  MIN_YEAR: 2000,
  MAX_YEAR: 2100,
  FIRST_MONTH: 1,
  LAST_MONTH: 12,
  MONTHS_PER_QUARTER: 3,
  QUARTERS_PER_YEAR: 4,
  MONEY_SCALE: 2,
} as const;

// Revenue policy: a fully refunded payment contributes zero revenue because
// only payments that remain SUCCESS are included. The current schema has no
// refund amount/refunded_at fields, so partial refunds cannot be represented.
export const STATISTICS_REVENUE_PAYMENT_STATUSES: PaymentStatus[] = [
  PaymentStatus.SUCCESS,
];

// Booking policy: "total bookings" means every non-soft-deleted booking
// request, regardless of its current workflow status.
export const STATISTICS_BOOKING_STATUSES: BookingStatus[] =
  Object.values(BookingStatus);

export const STATISTICS_CACHE_ALL_PERIODS = 'all';

export const STATISTICS_MONEY_PATTERN = /^\d+(?:\.\d{1,2})?$/;
export const STATISTICS_FORMATTED_MONEY_PATTERN = /^\d+\.\d{2}$/;

export const STATISTICS_DATE_TRUNC_UNIT: Record<StatisticsPeriod, string> = {
  [StatisticsPeriod.DAY]: 'day',
  [StatisticsPeriod.MONTH]: 'month',
  [StatisticsPeriod.QUARTER]: 'quarter',
};

export const STATISTICS_BUCKET_FORMAT: Record<StatisticsPeriod, string> = {
  [StatisticsPeriod.DAY]: 'YYYY-MM-DD',
  [StatisticsPeriod.MONTH]: 'YYYY-MM',
  [StatisticsPeriod.QUARTER]: 'YYYY-"Q"Q',
};
