interface SectionHeaderProps {
  eyebrow?: string
  title: string
  subtitle?: string
  center?: boolean
  action?: React.ReactNode
  as?: 'h1' | 'h2' | 'h3'
}

export default function SectionHeader({
  eyebrow,
  title,
  subtitle,
  center = false,
  action,
  as: Tag = 'h2',
}: SectionHeaderProps) {
  return (
    <div className={`flex items-end justify-between gap-4 ${center ? 'flex-col items-center text-center' : ''}`}>
      <div className={center ? 'text-center' : ''}>
        {eyebrow && (
          <p className="text-gold text-xs font-semibold uppercase tracking-widest mb-1">{eyebrow}</p>
        )}
        <Tag
          className="font-bold text-navy"
          style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: Tag === 'h1' ? '1.5rem' : '1.875rem', lineHeight: 1.2 }}
        >
          {title}
        </Tag>
        {subtitle && <p className="text-slate-500 text-sm mt-1">{subtitle}</p>}
      </div>
      {action && !center && <div className="shrink-0">{action}</div>}
    </div>
  )
}
