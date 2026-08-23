import { useTranslation } from 'react-i18next'

interface Props {
    page: number
    total: number
    perPage?: number
    onChange: (page: number) => void
}

export default function Pagination({
    page,
    total,
    perPage = 10,
    onChange,
}: Props) {
    const { t } = useTranslation('common')
    const pages = Math.ceil(total / perPage)

    if (pages <= 1) return null

    return (
        <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
            <span className="text-xs text-slate-400">
                {t('pagination.showing', {
                    from: (page - 1) * perPage + 1,
                    to: Math.min(page * perPage, total),
                    total,
                })}
            </span>

            <div className="flex gap-1">
                <button
                    onClick={() => onChange(page - 1)}
                    disabled={page === 1}
                    className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40"
                >
                    {t('pagination.prev')}
                </button>

                {Array.from(
                    { length: Math.min(pages, 5) },
                    (_, i) => i + 1,
                ).map((n) => (
                    <button
                        key={n}
                        onClick={() => onChange(n)}
                        className={`w-7 h-7 text-xs rounded-lg transition-colors ${n === page
                                ? 'bg-navy text-white'
                                : 'border border-slate-200 hover:bg-slate-50 text-slate-700'
                            }`}
                    >
                        {n}
                    </button>
                ))}

                <button
                    onClick={() => onChange(page + 1)}
                    disabled={page === pages}
                    className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40"
                >
                    {t('pagination.next')}
                </button>
            </div>
        </div>
    )
}
