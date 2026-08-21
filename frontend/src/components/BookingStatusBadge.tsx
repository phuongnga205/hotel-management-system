import { StatusBadge } from './admin/StatusBadge'
import { BOOKING_STATUS_CONFIG } from './admin/statusConfigs'
import type { BookingStatus } from '../api/types'

interface Props {
    status: BookingStatus
}

// Dung chung 1 config/1 component StatusBadge voi khu vuc admin (xem
// components/admin/StatusBadge.tsx) thay vi dinh nghia rieng 1 bang mau +
// label lan 2 o day - tranh lech mau/label giua trang khach va trang admin.
export default function BookingStatusBadge({ status }: Props) {
    return <StatusBadge status={status} config={BOOKING_STATUS_CONFIG} />
}
