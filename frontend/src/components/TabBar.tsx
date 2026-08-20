interface Tab<T extends string> {
  key: T
  label: string
  count?: number
}

interface TabBarProps<T extends string> {
  tabs: Tab<T>[]
  active: T
  onChange: (key: T) => void
  className?: string
}

export default function TabBar<T extends string>({ tabs, active, onChange, className = '' }: TabBarProps<T>) {
  return (
    <div className={`flex gap-1 flex-wrap ${className}`}>
      {tabs.map(({ key, label, count }) => (
        <button
          key={key}
          onClick={() => onChange(key)}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            active === key
              ? 'bg-navy text-white'
              : 'text-slate-500 bg-white border border-slate-100 hover:bg-slate-50'
          }`}
        >
          {label}
          {count !== undefined && (
            <span
              className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${
                active === key ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
              }`}
            >
              {count}
            </span>
          )}
        </button>
      ))}
    </div>
  )
}
