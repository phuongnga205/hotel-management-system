interface PaymentBadgeProps {
  status: 'PAID' | 'UNPAID'
}

export default function PaymentBadge({ status }: PaymentBadgeProps) {
  return status === 'PAID' ? (
    <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700">
      ✓ Paid
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-500">
      Unpaid
    </span>
  )
}
