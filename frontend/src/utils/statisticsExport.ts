import type { StatisticsQuery } from '../api/types'
import { STATISTICS_EXPORT_MIME_TYPE, STATISTICS_PERIOD } from '../constants/statistics'

export function getStatisticsExportFilename(query: StatisticsQuery): string {
  const selectedPeriod = query.period === STATISTICS_PERIOD.DAY
    ? `${query.year}-${String(query.month).padStart(2, '0')}`
    : String(query.year)
  return `statistics-${query.period.toLowerCase()}-${selectedPeriod}`
}

export function downloadStatisticsFile(blob: Blob, query: StatisticsQuery): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  const extension = blob.type === STATISTICS_EXPORT_MIME_TYPE.CSV ? 'csv' : 'xlsx'
  link.download = `${getStatisticsExportFilename(query)}.${extension}`
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}
