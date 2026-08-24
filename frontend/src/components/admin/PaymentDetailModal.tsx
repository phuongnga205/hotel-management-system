import { useTranslation } from 'react-i18next'
import PaymentBadge from '../PaymentBadge'
import type { AdminPayment } from '../../api/types'

// ---------------------------------------------------------------------------
// PaymentDetailModal - bang giao dich o AdminRevenueStatsPage kha chat (nhieu
// cot), nen click vao 1 dong se mo modal nay xem day du thong tin thay vi co
// nhoi them cot vao bang. Chi la view info - khong co action (khong sua/xoa
// giao dich).
// ---------------------------------------------------------------------------

interface PaymentDetailModalProps {
  payment: AdminPayment | null
  onClose: () => void
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5 border-b border-slate-50 last:border-b-0">
      <span className="text-xs font-semibold text-slate-500 shrink-0">{label}</span>
      <span className="text-sm text-navy text-right">{value}</span>
    </div>
  )
}

export default function PaymentDetailModal({ payment, onClose }: PaymentDetailModalProps) {
  const { t } = useTranslation(['admin', 'common'])

  if (!payment) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy/50"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-navy text-lg">
            {t('statistics.revenue.transactionsTitle')} #{payment.bookingId}
          </h3>
          <PaymentBadge status={payment.status} />
        </div>

        <div>
          <Row label={t('table.guest')} value={payment.booking?.guestName ?? payment.booking?.guestEmail ?? '—'} />
          {payment.booking?.guestName && <Row label={t('table.email')} value={payment.booking.guestEmail} />}
          <Row label={t('table.room')} value={payment.booking ? `${payment.booking.roomName} (${payment.booking.roomNumber})` : '—'} />
          <Row label={t('table.amount')} value={`$${Number(payment.amount).toLocaleString()}`} />
          <Row label={t('table.method')} value={t(`status.paymentMethod.${payment.method}`)} />
          <Row label={t('table.transactionId')} value={<span className="font-mono text-xs">{payment.transactionId ?? '—'}</span>} />
          <Row label={t('table.paidAt')} value={payment.paidAt ? new Date(payment.paidAt).toLocaleString() : '—'} />
          <Row label={t('table.createdAt')} value={new Date(payment.createdAt).toLocaleString()} />
        </div>

        <button
          onClick={onClose}
          className="mt-5 w-full py-2.5 text-sm font-semibold border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition-colors"
        >
          {t('common:common.close')}
        </button>
      </div>
    </div>
  )
}
