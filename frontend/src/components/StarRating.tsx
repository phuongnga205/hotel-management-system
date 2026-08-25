import { useState } from 'react'

interface StarRatingProps {
    rating: number
    size?: 'sm' | 'md' | 'lg'
    // Khi truyen onChange, component chuyen sang che do chon sao (hover +
    // click) - dung cho form vd BookingReviewPage. Khong truyen thi giu
    // nguyen hanh vi cu: chi hien thi, khong tuong tac.
    onChange?: (value: number) => void
}

export default function StarRating({
    rating,
    size = 'sm',
    onChange,
}: StarRatingProps) {
    const [hovered, setHovered] = useState<number | null>(null)
    const px = size === 'sm' ? 12 : size === 'md' ? 16 : 28
    const displayRating = hovered ?? rating

    return (
        <span className="flex items-center gap-0.5">
            {[1, 2, 3, 4, 5].map((s) => {
                const filled = onChange ? s <= displayRating : s <= Math.round(rating)
                const star = (
                    <svg
                        width={px}
                        height={px}
                        viewBox="0 0 16 16"
                        fill="currentColor"
                        className={filled ? 'text-gold' : 'text-slate-300'}
                    >
                        <path d="M8 1l1.8 3.6L14 5.4l-3 2.9.7 4.1L8 10.4l-3.7 1.9.7-4.1-3-2.9 4.2-.8z" />
                    </svg>
                )

                if (!onChange) return <span key={s}>{star}</span>

                return (
                    <button
                        key={s}
                        type="button"
                        onClick={() => onChange(s)}
                        onMouseEnter={() => setHovered(s)}
                        onMouseLeave={() => setHovered(null)}
                        className="cursor-pointer transition-transform hover:scale-110"
                    >
                        {star}
                    </button>
                )
            })}
        </span>
    )
}
