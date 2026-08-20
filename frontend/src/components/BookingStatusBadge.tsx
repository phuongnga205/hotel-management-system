const BOOKING_STATUS_CONFIG: Record<
    string,
    {
        label: string
        bg: string
        text: string
        dot: string
    }
> = {
    PENDING: {
        label: 'Pending',
        bg: 'bg-amber-50',
        text: 'text-amber-700',
        dot: 'bg-amber-400',
    },
    ACCEPTED: {
        label: 'Accepted',
        bg: 'bg-emerald-50',
        text: 'text-emerald-700',
        dot: 'bg-emerald-400',
    },
    REJECTED: {
        label: 'Rejected',
        bg: 'bg-red-50',
        text: 'text-red-600',
        dot: 'bg-red-400',
    },
    CANCELLED: {
        label: 'Cancelled',
        bg: 'bg-slate-100',
        text: 'text-slate-500',
        dot: 'bg-slate-400',
    },
}

interface Props {
    status: string
}

export default function BookingStatusBadge({ status }: Props) {
    const cfg = BOOKING_STATUS_CONFIG[status] ?? BOOKING_STATUS_CONFIG.PENDING

    return (
        <span
            className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${cfg.bg} ${cfg.text}`}
        >
            <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
            {cfg.label}
        </span>
    )
}
