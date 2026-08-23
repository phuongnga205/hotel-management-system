import type { ReactNode } from 'react'

interface Props {
    eyebrow?: string
    title: string
    subtitle?: string
    action?: ReactNode
}

export default function PageHeader({
    eyebrow,
    title,
    subtitle,
    action,
}: Props) {
    return (
        <div className="flex items-start justify-between gap-4 mb-8">
            <div>
                {eyebrow && (
                    <p className="text-gold text-xs font-semibold uppercase tracking-widest mb-1">
                        {eyebrow}
                    </p>
                )}

                <h1
                    className="text-2xl font-bold text-navy"
                    style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                >
                    {title}
                </h1>

                {subtitle && (
                    <p className="text-slate-500 text-sm mt-1">{subtitle}</p>
                )}
            </div>

            {action && <div className="shrink-0">{action}</div>}
        </div>
    )
}
