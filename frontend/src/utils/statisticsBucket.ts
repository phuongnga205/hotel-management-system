import type { StatisticsBucket, StatisticsPeriod } from '../api/types'
import { STATISTICS_PERIOD } from '../constants/statistics'

const MONTH_SHORT_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** Shortens a bucket `label` from the statistics API for chart axes/lists. */
export function formatBucketLabel(label: string, period: StatisticsPeriod): string {
  if (period === STATISTICS_PERIOD.MONTH) {
    const month = Number(label.split('-')[1])
    return MONTH_SHORT_NAMES[month - 1] ?? label
  }
  if (period === STATISTICS_PERIOD.QUARTER) {
    return label.split('-')[1] ?? label
  }
  if (period === STATISTICS_PERIOD.YEAR) return label
  // DAY -> "YYYY-MM-DD", show just the day number.
  return label.split('-')[2] ?? label
}

/** Bucket with the highest `revenue`; null when all buckets are empty. */
export function bestRevenueBucket(buckets: StatisticsBucket[]): StatisticsBucket | null {
  return buckets.reduce<StatisticsBucket | null>(
    (best, bucket) => (best === null || Number(bucket.revenue) > Number(best.revenue) ? bucket : best),
    null,
  )
}

/** Bucket with the highest `bookingCount`; null when all buckets are empty. */
export function bestBookingBucket(buckets: StatisticsBucket[]): StatisticsBucket | null {
  return buckets.reduce<StatisticsBucket | null>(
    (best, bucket) => (best === null || bucket.bookingCount > best.bookingCount ? bucket : best),
    null,
  )
}
