import { useTranslation } from 'react-i18next'
import { colors } from '../tokens/colors'

interface PriceSummaryCardProps {
  pricePerNight: number
  nights: number
  taxRate?: number
  onBook?: () => void
  bookLabel?: string
  loading?: boolean
  sticky?: boolean
  meta?: { label: string; value: string }[]
  footer?: React.ReactNode
}

export default function PriceSummaryCard({
  pricePerNight,
  nights,
  taxRate = 0.12,
  onBook,
  bookLabel,
  loading = false,
  sticky = false,
  meta,
  footer,
}: PriceSummaryCardProps) {
  const { t } = useTranslation('common')
  const subtotal = nights * pricePerNight
  const taxes = Math.round(subtotal * taxRate)
  const total = subtotal + taxes

  return (
    <div className={`bg-white rounded-2xl border border-slate-100 shadow-sm p-6 ${sticky ? 'sticky top-24' : ''}`}>
      <div className="mb-4">
        <div className="text-2xl font-bold text-navy">${pricePerNight}</div>
        <div className="text-xs text-slate-400">{t('priceSummary.perNight')}</div>
      </div>

      {meta && meta.length > 0 && (
        <div className="space-y-2 mb-5 text-sm border-b border-slate-100 pb-4">
          {meta.map(({ label, value }) => (
            <div key={label} className="flex justify-between">
              <span className="text-slate-500">{label}</span>
              <span className="font-medium text-navy">{value}</span>
            </div>
          ))}
        </div>
      )}

      {nights > 0 && (
        <div className="space-y-2 text-sm mb-5">
          <div className="flex justify-between">
            <span className="text-slate-500">${pricePerNight} × {nights} night{nights !== 1 ? 's' : ''}</span>
            <span className="font-semibold text-navy">${subtotal.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">{t('priceSummary.taxesFees')}</span>
            <span className="font-semibold text-navy">${taxes.toLocaleString()}</span>
          </div>
          <div className="flex justify-between pt-2 mt-1 border-t border-slate-100">
            <span className="font-bold text-navy">{t('priceSummary.total')}</span>
            <span className="font-bold text-navy text-lg">${total.toLocaleString()}</span>
          </div>
          <div className="text-xs text-slate-400 text-right">{t('priceSummary.currencyNote')}</div>
        </div>
      )}

      {onBook && (
        <button
          onClick={onBook}
          disabled={loading || nights === 0}
          className="w-full py-3 rounded-xl font-semibold text-sm text-white transition-all hover:opacity-90 active:scale-95 disabled:opacity-60 mb-3"
          style={{ background: `linear-gradient(135deg, ${colors.navy} 0%, ${colors.navyLight} 100%)` }}
        >
          {loading ? t('priceSummary.processing') : (bookLabel ?? t('priceSummary.bookThisRoom'))}
        </button>
      )}

      {footer && <div className="mt-2">{footer}</div>}
    </div>
  )
}
