type StatusIconVariant = 'success' | 'error' | 'warning' | 'loading'

interface StatusIconCircleProps {
  variant: StatusIconVariant
  size?: 'sm' | 'md' | 'lg'
}

const SIZE = { sm: 'w-10 h-10', md: 'w-14 h-14', lg: 'w-20 h-20' } as const
const ICON_SIZE = { sm: 'w-5 h-5', md: 'w-7 h-7', lg: 'w-10 h-10' } as const

export default function StatusIconCircle({ variant, size = 'md' }: StatusIconCircleProps) {
  const circle = SIZE[size]
  const icon = ICON_SIZE[size]

  if (variant === 'loading') {
    return (
      <div className={`${circle} rounded-full bg-navy/5 flex items-center justify-center`}>
        <svg className={`animate-spin ${icon} text-navy`} viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    )
  }

  if (variant === 'success') {
    return (
      <div className={`${circle} rounded-full bg-emerald-50 flex items-center justify-center`}>
        <svg xmlns="http://www.w3.org/2000/svg" className={`${icon} text-emerald-500`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      </div>
    )
  }

  if (variant === 'error') {
    return (
      <div className={`${circle} rounded-full bg-red-50 flex items-center justify-center`}>
        <svg xmlns="http://www.w3.org/2000/svg" className={`${icon} text-red-500`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </div>
    )
  }

  return (
    <div className={`${circle} rounded-full bg-amber-50 flex items-center justify-center`}>
      <svg xmlns="http://www.w3.org/2000/svg" className={`${icon} text-amber-500`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
      </svg>
    </div>
  )
}
