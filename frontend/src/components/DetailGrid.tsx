interface DetailGridItem {
  label: string
  value: React.ReactNode
}

interface DetailGridProps {
  items: DetailGridItem[]
  cols?: 2 | 3
  className?: string
}

const COLS = { 2: 'grid-cols-2', 3: 'grid-cols-3' } as const

export default function DetailGrid({ items, cols = 2, className = '' }: DetailGridProps) {
  return (
    <div className={`grid ${COLS[cols]} gap-3 text-sm ${className}`}>
      {items.map(({ label, value }) => (
        <div key={label}>
          <div className="text-xs text-slate-400 mb-0.5">{label}</div>
          <div className="font-medium text-navy">{value}</div>
        </div>
      ))}
    </div>
  )
}
