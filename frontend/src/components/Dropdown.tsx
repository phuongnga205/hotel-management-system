import { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'

export interface DropdownOption {
  value: string
  label: string
}

interface PanelPos { top: number; left: number; width: number; flip: boolean }

interface DropdownProps {
  value: string
  onChange: (value: string) => void
  options: DropdownOption[]
  placeholder?: string
  className?: string
  size?: 'sm' | 'md'
  statusDots?: Record<string, string>
  disabled?: boolean
}

export default function Dropdown({
  value,
  onChange,
  options,
  placeholder = 'Select...',
  className = '',
  size = 'md',
  statusDots,
  disabled = false,
}: DropdownProps) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState<PanelPos>({ top: 0, left: 0, width: 0, flip: false })
  const triggerRef = useRef<HTMLButtonElement>(null)

  const selected = options.find((o) => o.value === value)

  const measure = useCallback(() => {
    if (!triggerRef.current) return
    const r = triggerRef.current.getBoundingClientRect()
    const panelH = Math.min(options.length * 40 + 8, 280)
    const flip = r.bottom + panelH + 8 > window.innerHeight && r.top > panelH + 8
    setPos({ top: flip ? r.top - panelH - 6 : r.bottom + 6, left: r.left, width: r.width, flip })
  }, [options.length])

  const toggle = () => {
    if (disabled) return
    if (!open) measure()
    setOpen((o) => !o)
  }

  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => {
      if (triggerRef.current && !triggerRef.current.closest('[data-dropdown]')?.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    const rePos = () => measure()
    document.addEventListener('mousedown', close)
    window.addEventListener('scroll', rePos, true)
    window.addEventListener('resize', rePos)
    return () => {
      document.removeEventListener('mousedown', close)
      window.removeEventListener('scroll', rePos, true)
      window.removeEventListener('resize', rePos)
    }
  }, [open, measure])

  const padY = size === 'sm' ? 'py-1.5' : 'py-2.5'
  const padX = size === 'sm' ? 'px-2.5' : 'px-3'
  const textSize = size === 'sm' ? 'text-xs' : 'text-sm'
  const itemPad = size === 'sm' ? 'px-2.5 py-2' : 'px-3 py-2.5'

  return (
    <div data-dropdown="" className={`relative ${className}`}>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={toggle}
        className={`
          w-full flex items-center justify-between gap-2
          border rounded-lg bg-white
          ${padX} ${padY} ${textSize}
          text-navy font-medium
          transition-all duration-150
          ${open ? 'border-[#0B2545] ring-2 ring-[#0B2545]/20' : 'border-slate-200 hover:border-[#0B2545]/40'}
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
      >
        <span className={`flex items-center gap-2 truncate ${!selected ? 'text-slate-400 font-normal' : ''}`}>
          {statusDots && selected && (
            <span className={`w-2 h-2 rounded-full shrink-0 ${statusDots[value] ?? 'bg-slate-300'}`} />
          )}
          {selected ? selected.label : placeholder}
        </span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && createPortal(
        <div
          className="fixed z-[9999] bg-white border border-slate-200 rounded-xl overflow-hidden"
          style={{
            top: pos.top,
            left: pos.left,
            width: pos.width,
            boxShadow: '0 8px 28px rgba(11,37,69,0.14)',
          }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div className="overflow-y-auto" style={{ maxHeight: 280 }}>
            {options.map((opt) => {
              const isActive = opt.value === value
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => { onChange(opt.value); setOpen(false) }}
                  className={`
                    w-full flex items-center gap-2.5 text-left transition-colors
                    ${itemPad} ${textSize}
                    ${isActive
                      ? 'bg-[#0B2545] text-white font-semibold'
                      : 'text-slate-700 hover:bg-slate-50 hover:text-navy'}
                  `}
                >
                  {statusDots && (
                    <span
                      className={`w-1.5 h-1.5 rounded-full shrink-0 ${statusDots[opt.value] ?? 'bg-slate-300'}`}
                      style={isActive ? { background: 'rgba(255,255,255,0.5)' } : {}}
                    />
                  )}
                  <span className="truncate flex-1">{opt.label}</span>
                  {isActive && (
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
              )
            })}
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
