type AlertVariant = 'success' | 'error' | 'warning' | 'info'

interface AlertBannerProps {
  variant: AlertVariant
  children: React.ReactNode
  className?: string
}

const CONFIG: Record<AlertVariant, { bg: string; border: string; text: string; icon: React.ReactNode }> = {
  success: {
    bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-emerald-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
    ),
  },
  error: {
    bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-600',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-red-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
      </svg>
    ),
  },
  warning: {
    bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-amber-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
      </svg>
    ),
  },
  info: {
    bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-blue-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
}

export default function AlertBanner({ variant, children, className = '' }: AlertBannerProps) {
  const { bg, border, text, icon } = CONFIG[variant]
  return (
    <div className={`flex items-start gap-2 ${bg} border ${border} rounded-lg p-3 ${className}`}>
      {icon}
      <div className={`text-sm ${text}`}>{children}</div>
    </div>
  )
}
