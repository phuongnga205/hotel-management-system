interface Props {
    // roomType o backend la chuoi tu do (khong phai enum) - vi vay badge nay
    // CHI la 1 pill hien thi trung tinh, khong to mau/style rieng theo tung
    // gia tri nhu truoc (khong co 1 tap gia tri co dinh nao de gan mau).
    type: string
}

export default function RoomTypeBadge({ type }: Props) {
    return (
        <span className="text-xs font-semibold px-2 py-0.5 rounded-full uppercase tracking-wide bg-surface text-navy/70">
            {type}
        </span>
    )
}
