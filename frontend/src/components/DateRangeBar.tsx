import DatePicker from './Calendar'
import Dropdown from './Dropdown'

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

const GUEST_OPTIONS = (max: number) =>
  Array.from({ length: max }, (_, i) => ({
    value: String(i + 1),
    label: `${i + 1} Guest${i + 1 > 1 ? 's' : ''}`,
  }))

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
  return (
    <div className={`bg-white rounded-2xl shadow-sm border border-slate-100 p-5 ${className}`}>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
        <div>
          <label className="block text-xs font-semibold text-navy uppercase tracking-wide mb-1.5">
            Check-in
          </label>
          <DatePicker
            value={checkIn}
            onChange={onCheckInChange}
            placeholder="Check-in date"
            rangeStart={checkIn}
            rangeEnd={checkOut}
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-navy uppercase tracking-wide mb-1.5">
            Check-out
          </label>
          <DatePicker
            value={checkOut}
            onChange={onCheckOutChange}
            placeholder="Check-out date"
            minDate={checkIn || undefined}
            rangeStart={checkIn}
            rangeEnd={checkOut}
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-navy uppercase tracking-wide mb-1.5">
            Guests
          </label>
          <Dropdown
            value={guests}
            onChange={onGuestsChange}
            options={GUEST_OPTIONS(maxGuests)}
          />
        </div>

        <button
          onClick={onSearch}
          className="w-full py-2.5 rounded-lg font-semibold text-sm text-white transition-all hover:opacity-90 active:scale-95"
          style={{ background: 'linear-gradient(135deg, #0B2545 0%, #1A3A5C 100%)' }}
        >
          Search Rooms
        </button>
      </div>
    </div>
  )
}
