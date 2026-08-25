import type { RevenueBookingsStatistics, StatisticsBucket, StatisticsQuery } from '../types'

const MOCK_DELAY_MS = 400

function mockDelay<T>(data: T, ms = MOCK_DELAY_MS): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(data), ms))
}

function pad(value: number): string {
  return String(value).padStart(2, '0')
}

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate()
}

/** Deterministic pseudo-random per label so re-fetches of the same query stay stable. */
function seededAmount(label: string, max: number): number {
  let hash = 0
  for (let i = 0; i < label.length; i += 1) hash = (hash * 31 + label.charCodeAt(i)) >>> 0
  return Math.round((hash % 1000) / 1000 * max)
}

function buildBuckets(query: StatisticsQuery): StatisticsBucket[] {
  const labels: string[] =
    query.period === 'DAY'
      ? Array.from({ length: daysInMonth(query.year, query.month ?? 1) }, (_, i) => `${query.year}-${pad(query.month ?? 1)}-${pad(i + 1)}`)
      : query.period === 'MONTH'
        ? Array.from({ length: 12 }, (_, i) => `${query.year}-${pad(i + 1)}`)
        : Array.from({ length: 4 }, (_, i) => `${query.year}-Q${i + 1}`)

  return labels.map((label) => ({
    label,
    revenue: seededAmount(label, 130000).toFixed(2),
    bookingCount: seededAmount(`count:${label}`, 55),
  }))
}

export const statisticsMockApi = {
  getRevenueAndBookings: async (query: StatisticsQuery): Promise<RevenueBookingsStatistics> => {
    const buckets = buildBuckets(query)
    const totalRevenue = buckets.reduce((sum, b) => sum + Number(b.revenue), 0)
    const totalBookings = buckets.reduce((sum, b) => sum + b.bookingCount, 0)
    return mockDelay({
      period: query.period,
      year: query.year,
      month: query.period === 'DAY' ? (query.month ?? null) : null,
      totalRevenue: totalRevenue.toFixed(2),
      totalBookings,
      buckets,
      isCached: false,
    })
  },
}
