const ROOM_TYPE_COLORS: Record<string, string> = {
    SINGLE: 'bg-slate-100 text-slate-700',
    DOUBLE: 'bg-blue-50 text-blue-700',
    DELUXE: 'bg-amber-50 text-amber-700',
    SUITE: 'bg-purple-50 text-purple-700',
    PENTHOUSE: 'bg-rose-50 text-rose-700',
}

interface Props {
    type: string
}

export default function RoomTypeBadge({ type }: Props) {
    return (
        <span
            className={`text-xs font-semibold px-2 py-0.5 rounded-full uppercase tracking-wide ${ROOM_TYPE_COLORS[type] ?? 'bg-gray-100 text-gray-600'
                }`}
        >
            {type}
        </span>
    )
}
