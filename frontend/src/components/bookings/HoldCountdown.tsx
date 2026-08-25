import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

const URGENT_THRESHOLD_MS = 2 * 60 * 1000

function formatMmSs(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000))
  const mm = Math.floor(totalSeconds / 60)
  const ss = totalSeconds % 60
  return `${mm}:${String(ss).padStart(2, '0')}`
}

interface HoldCountdownProps {
  // Moc epoch ms het han giu cho (booking.createdAt + BOOKING_HOLD_MINUTES,
  // xem constants/booking.ts) - KHONG phai field tra ve tu API.
  expiresAt: number
  onExpire?: () => void
}

// Dong ho dem nguoc hien o BookingCard cho booking PENDING con trong han
// giu cho - tu tick moi giay, doi mau "urgency" khi con duoi 2 phut, va goi
// onExpire() dung 1 lan khi het han (de component cha an nut Pay/style urgent
// ma khong can doi lan refetch API/cron ke tiep).
export default function HoldCountdown({ expiresAt, onExpire }: HoldCountdownProps) {
  const { t } = useTranslation('booking')
  const [msLeft, setMsLeft] = useState(() => expiresAt - Date.now())

  useEffect(() => {
    if (expiresAt - Date.now() <= 0) {
      onExpire?.()
      return
    }
    const id = setInterval(() => {
      const remaining = expiresAt - Date.now()
      setMsLeft(remaining)
      if (remaining <= 0) {
        clearInterval(id)
        onExpire?.()
      }
    }, 1000)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expiresAt])

  if (msLeft <= 0) return null

  const urgent = msLeft < URGENT_THRESHOLD_MS

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
        urgent ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'
      }`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${urgent ? 'bg-red-500 animate-pulse' : 'bg-amber-500'}`} />
      {t('labels.holdCountdown', { time: formatMmSs(msLeft) })}
    </span>
  )
}
