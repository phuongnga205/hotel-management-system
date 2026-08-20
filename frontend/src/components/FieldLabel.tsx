import { ReactNode } from 'react'

interface Props {
    children: ReactNode
    optional?: boolean
}

export default function FieldLabel({
    children,
    optional,
}: Props) {
    return (
        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
            {children}
            {optional && (
                <span className="text-slate-400 normal-case font-normal ml-1">
                    (optional)
                </span>
            )}
        </label>
    )
}
