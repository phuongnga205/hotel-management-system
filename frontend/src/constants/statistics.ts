export const STATISTICS_PERIOD = {
  DAY: 'DAY',
  MONTH: 'MONTH',
  QUARTER: 'QUARTER',
  YEAR: 'YEAR',
} as const

export type StatisticsPeriod = typeof STATISTICS_PERIOD[keyof typeof STATISTICS_PERIOD]

export const STATISTICS_EXPORT_MIME_TYPE = {
  CSV: 'text/csv',
  EXCEL: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
} as const

export const STATISTICS_FILTER_ALL = 'ALL' as const
