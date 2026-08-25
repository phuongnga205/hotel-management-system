import { useTranslation } from 'react-i18next'
import Dropdown from '../Dropdown'
import type { StatisticsPeriod, StatisticsQuery } from '../../api/types'

const YEAR_OPTIONS_COUNT = 4
const MONTHS_PER_YEAR = 12

interface StatisticsPeriodControlsProps {
  query: StatisticsQuery
  onChange: (query: StatisticsQuery) => void
  className?: string
}

/**
 * Period/year/month picker for `GET /statistics/revenue-bookings`
 * (backend/src/statistics). Shared by AdminBookingStatsPage and
 * AdminRevenueStatsPage so both pages build the same query shape.
 */
export default function StatisticsPeriodControls({ query, onChange, className = '' }: StatisticsPeriodControlsProps) {
  const { t } = useTranslation('admin')
  const currentYear = new Date().getFullYear()

  const periodOptions = [
    { value: 'MONTH', label: t('statistics.controls.periodMonth') },
    { value: 'QUARTER', label: t('statistics.controls.periodQuarter') },
    { value: 'DAY', label: t('statistics.controls.periodDay') },
  ]
  const yearOptions = Array.from({ length: YEAR_OPTIONS_COUNT }, (_, i) => currentYear - i).map((year) => ({
    value: String(year),
    label: String(year),
  }))
  const monthOptions = Array.from({ length: MONTHS_PER_YEAR }, (_, i) => ({
    value: String(i + 1),
    label: String(i + 1),
  }))

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <Dropdown
        value={query.period}
        onChange={(v) => {
          const period = v as StatisticsPeriod
          const month = period === 'DAY' ? (query.month ?? new Date().getMonth() + 1) : undefined
          onChange({ ...query, period, month })
        }}
        options={periodOptions}
        size="sm"
        className="w-32"
      />
      <Dropdown
        value={String(query.year)}
        onChange={(v) => onChange({ ...query, year: Number(v) })}
        options={yearOptions}
        size="sm"
        className="w-24"
      />
      {query.period === 'DAY' && (
        <Dropdown
          value={String(query.month ?? 1)}
          onChange={(v) => onChange({ ...query, month: Number(v) })}
          options={monthOptions}
          size="sm"
          className="w-20"
        />
      )}
    </div>
  )
}
