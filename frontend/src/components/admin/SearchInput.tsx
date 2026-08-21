import { useTranslation } from 'react-i18next'

// ---------------------------------------------------------------------------
// SearchInput — search field with magnifier icon
// ---------------------------------------------------------------------------

export const SearchInput = ({
  value,
  onChange,
  placeholder,
  className = '',
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  className?: string
}) => {
  const { t } = useTranslation('common')
  return (
  <div className={`relative ${className}`}>
    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
      <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
      </svg>
    </span>
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder ?? t('common.search')}
      className="border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-sm text-navy bg-white focus:outline-none focus:ring-1 focus:ring-navy/30 w-full transition-all"
    />
  </div>
  )
}
