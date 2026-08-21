interface StarRatingProps {
    rating: number
    size?: 'sm' | 'md'
}

export default function StarRating({
    rating,
    size = 'sm',
}: StarRatingProps) {
    const px = size === 'sm' ? 12 : 16

    return (
        <span className="flex items-center gap-0.5">
            {[1, 2, 3, 4, 5].map((s) => (
                <svg
                    key={s}
                    width={px}
                    height={px}
                    viewBox="0 0 16 16"
                    fill="currentColor"
                    className={s <= Math.round(rating) ? 'text-gold' : 'text-slate-300'}
                >
                    <path d="M8 1l1.8 3.6L14 5.4l-3 2.9.7 4.1L8 10.4l-3.7 1.9.7-4.1-3-2.9 4.2-.8z" />
                </svg>
            ))}
        </span>
    )
}
