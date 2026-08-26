import { useTranslation } from 'react-i18next'
import Dropdown from '../Dropdown'
import type { StatisticsQuery } from '../../api/types'
import { STATISTICS_PERIOD, type StatisticsPeriod } from '../../constants/statistics'

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
    { value: STATISTICS_PERIOD.DAY, label: t('statistics.controls.periodDay') },
    { value: STATISTICS_PERIOD.MONTH, label: t('statistics.controls.periodMonth') },
    { value: STATISTICS_PERIOD.QUARTER, label: t('statistics.controls.periodQuarter') },
    { value: STATISTICS_PERIOD.YEAR, label: t('statistics.controls.periodYear') },
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
      <div className="inline-flex overflow-hidden rounded-lg border border-slate-200 bg-white" role="group" aria-label={t('statistics.controls.period')}>
        {periodOptions.map((option) => {
          const period = option.value as StatisticsPeriod
          const active = query.period === period

          return (
            <button
              key={period}
              type="button"
              aria-pressed={active}
              onClick={() => {
                const month = period === STATISTICS_PERIOD.DAY ? (query.month ?? new Date().getMonth() + 1) : undefined
                onChange({ ...query, period, month })
              }}
              className={`px-3 py-2 text-xs font-semibold transition-colors ${
                active ? 'bg-navy text-white' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              {option.label}
            </button>
          )
        })}
      </div>
      <Dropdown
        value={String(query.year)}
        onChange={(v) => onChange({ ...query, year: Number(v) })}
        options={yearOptions}
        size="sm"
        className="w-24"
      />
      {query.period === STATISTICS_PERIOD.DAY && (
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
