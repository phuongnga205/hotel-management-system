import { useTranslation } from 'react-i18next'
import type { PaymentMethod } from '../../api/types'

const METHODS: PaymentMethod[] = ['CASH', 'BANK_TRANSFER', 'CREDIT_CARD', 'VNPAY']

interface PaymentMethodSelectorProps {
  value: PaymentMethod | null
  onChange: (method: PaymentMethod) => void
  disabled?: boolean
}

// Tile chon phuong thuc thanh toan - tach rieng component vi co the tai su
// dung sau nay (vd man PaymentHistoryPage/admin payment detail can hien thi
// lai cung 1 bo icon/label). Enum PaymentMethod dung dung gia tri that
// (api/types.ts), KHONG dung bo method gia trong nhap.tsx.
export default function PaymentMethodSelector({ value, onChange, disabled = false }: PaymentMethodSelectorProps) {
  const { t } = useTranslation('booking')

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {METHODS.map((method) => {
        const active = value === method
        return (
          <button
            key={method}
            type="button"
            disabled={disabled}
            onClick={() => onChange(method)}
            className={`text-left px-4 py-3.5 rounded-xl border transition-all ${
              active
                ? 'border-navy bg-navy/5 ring-2 ring-navy/20'
                : 'border-slate-200 hover:border-navy/40'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            <div className="flex items-center gap-3">
              <span
                className={`w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center ${
                  active ? 'border-navy' : 'border-slate-300'
                }`}
              >
                {active && <span className="w-2 h-2 rounded-full bg-navy" />}
              </span>
              <span className="text-sm font-semibold text-navy">{t(`payment.method.${method}`)}</span>
            </div>
          </button>
        )
      })}
    </div>
  )
}
