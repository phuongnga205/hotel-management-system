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
  // center=true doi ca huong flex lan align/justify - khong duoc cong don
  // 'items-end justify-between' voi 'items-center' vi 2 utility cung thuoc
  // tinh align-items se ganh nhau theo thu tu CSS output cua Tailwind
  // (khong theo thu tu class trong chuoi), gay center bi lech.
  return (
    <div className={`flex gap-4 ${center ? 'flex-col items-center text-center' : 'items-end justify-between'}`}>
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
