interface AmenityPillProps {
  children: React.ReactNode
  size?: 'sm' | 'md'
}

export default function AmenityPill({ children, size = 'sm' }: AmenityPillProps) {
  return (
    <span
      className={`bg-surface text-slate-600 rounded-md border border-slate-100 ${
        size === 'md' ? 'text-xs px-2.5 py-1' : 'text-xs px-2 py-0.5'
      }`}
    >
      {children}
    </span>
  )
}
