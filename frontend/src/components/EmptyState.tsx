import type { ReactNode } from 'react'

interface Props {
    icon: string
    title: string
    desc?: string
    action?: ReactNode
}

export default function EmptyState({
    icon,
    title,
    desc,
    action,
}: Props) {
    return (
        <div className="text-center py-16">
            <div className="text-4xl mb-4">{icon}</div>

            <h3 className="font-semibold text-navy text-lg mb-1">
                {title}
            </h3>

            {desc && (
                <p className="text-slate-500 text-sm mb-5">{desc}</p>
            )}

            {action}
        </div>
    )
}
