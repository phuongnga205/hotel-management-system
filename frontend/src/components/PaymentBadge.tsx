import { StatusBadge } from './admin/StatusBadge'
import { PAYMENT_STATUS_CONFIG } from './admin/statusConfigs'
import type { PaymentStatus } from '../api/types'

interface PaymentBadgeProps {
  // null = booking chua co payment nao (chua thanh toan) - khong phai 1
  // PaymentStatus that tra ve tu API.
  status: PaymentStatus | null
}

export default function PaymentBadge({ status }: PaymentBadgeProps) {
  return <StatusBadge status={status ?? 'NONE'} config={PAYMENT_STATUS_CONFIG} />
}
