import { useTranslation } from 'react-i18next'
import DatePicker from './Calendar'
import Dropdown from './Dropdown'
import { colors } from '../tokens/colors'

interface DateRangeBarProps {
  checkIn: string
  checkOut: string
  guests: string
  onCheckInChange: (v: string) => void
  onCheckOutChange: (v: string) => void
  onGuestsChange: (v: string) => void
  onSearch: () => void
  maxGuests?: number
  className?: string
}

export default function DateRangeBar({
  checkIn,
  checkOut,
  guests,
  onCheckInChange,
  onCheckOutChange,
  onGuestsChange,
  onSearch,
  maxGuests = 6,
  className = '',
}: DateRangeBarProps) {
  const { t } = useTranslation('common')
  const guestOptions = Array.from({ length: maxGuests }, (_, i) => ({
    value: String(i + 1),
    label: t('dateRangeBar.guestCount', { count: i + 1 }),
  }))

  return (
    <div className={`bg-white rounded-2xl shadow-sm border border-slate-100 p-5 ${className}`}>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
        <div>
          <label className="block text-xs font-semibold text-navy uppercase tracking-wide mb-1.5">
            {t('dateRangeBar.checkIn')}
          </label>
          <DatePicker
            value={checkIn}
            onChange={onCheckInChange}
            placeholder={t('dateRangeBar.checkInPlaceholder')}
            rangeStart={checkIn}
            rangeEnd={checkOut}
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-navy uppercase tracking-wide mb-1.5">
            {t('dateRangeBar.checkOut')}
          </label>
          <DatePicker
            value={checkOut}
            onChange={onCheckOutChange}
            placeholder={t('dateRangeBar.checkOutPlaceholder')}
            minDate={checkIn || undefined}
            rangeStart={checkIn}
            rangeEnd={checkOut}
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-navy uppercase tracking-wide mb-1.5">
            {t('dateRangeBar.guests')}
          </label>
          <Dropdown
            value={guests}
            onChange={onGuestsChange}
            options={guestOptions}
          />
        </div>

        <button
          onClick={onSearch}
          className="w-full py-2.5 rounded-lg font-semibold text-sm text-white transition-all hover:opacity-90 active:scale-95"
          style={{ background: `linear-gradient(135deg, ${colors.navy} 0%, ${colors.navyLight} 100%)` }}
        >
          {t('dateRangeBar.search')}
        </button>
      </div>
    </div>
  )
}
