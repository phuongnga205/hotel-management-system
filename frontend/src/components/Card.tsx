import { ReactNode } from 'react'

interface Props {
    children: ReactNode
    className?: string
}

export default function Card({
    children,
    className = '',
}: Props) {
    return (
        <div
            className={`bg-white rounded-2xl border border-slate-100 shadow-sm ${className}`}
        >
            {children}
        </div>
    )
}
