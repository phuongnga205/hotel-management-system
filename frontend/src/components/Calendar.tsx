import { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'

// ── helpers ───────────────────────────────────────────────────────────────────

const DAYS_SHORT = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

function toYMD(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function parseYMD(s: string): Date | null {
  if (!s) return null
  const [y, m, d] = s.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  return isNaN(date.getTime()) ? null : date
}

function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}

function firstWeekday(year: number, month: number) {
  return new Date(year, month, 1).getDay()
}

// ── CalendarPanel (the grid — also exported for inline use) ───────────────────

interface CalendarPanelProps {
  value: string
  onChange: (ymd: string) => void
  minDate?: string
  maxDate?: string
  rangeStart?: string
  rangeEnd?: string
}

export function CalendarPanel({ value, onChange, minDate, maxDate, rangeStart, rangeEnd }: CalendarPanelProps) {
  const today = new Date()
  const selected = parseYMD(value)
  const initYear  = selected ? selected.getFullYear() : today.getFullYear()
  const initMonth = selected ? selected.getMonth()    : today.getMonth()

  const [year, setYear]   = useState(initYear)
  const [month, setMonth] = useState(initMonth)

  const totalDays = daysInMonth(year, month)
  const startDay  = firstWeekday(year, month)

  const prevMonth = () => { if (month === 0) { setMonth(11); setYear((y) => y - 1) } else setMonth((m) => m - 1) }
  const nextMonth = () => { if (month === 11) { setMonth(0); setYear((y) => y + 1) } else setMonth((m) => m + 1) }

  const cells: (number | null)[] = [
    ...Array(startDay).fill(null),
    ...Array.from({ length: totalDays }, (_, i) => i + 1),
  ]
  while (cells.length % 7 !== 0) cells.push(null)

  const minD = parseYMD(minDate ?? '')
  const maxD = parseYMD(maxDate ?? '')
  const rsD  = parseYMD(rangeStart ?? '')
  const reD  = parseYMD(rangeEnd ?? '')

  const disabled = (day: number) => {
    const d = new Date(year, month, day)
    if (minD && d < minD) return true
    if (maxD && d > maxD) return true
    return false
  }
  const isSel      = (day: number) => !!selected && selected.getFullYear() === year && selected.getMonth() === month && selected.getDate() === day
  const isTodayDay = (day: number) => today.getFullYear() === year && today.getMonth() === month && today.getDate() === day
  const inRange    = (day: number) => { if (!rsD || !reD) return false; const d = new Date(year, month, day); return d > rsD && d < reD }
  const isRangeS   = (day: number) => !!rsD && rsD.getFullYear() === year && rsD.getMonth() === month && rsD.getDate() === day
  const isRangeE   = (day: number) => !!reD && reD.getFullYear() === year && reD.getMonth() === month && reD.getDate() === day

  return (
    <div className="w-72 bg-white rounded-2xl overflow-hidden select-none" style={{ boxShadow: '0 8px 28px rgba(11,37,69,0.14)' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3" style={{ background: '#0B2545' }}>
        <button type="button" onClick={prevMonth} className="w-7 h-7 rounded-lg flex items-center justify-center text-white/70 hover:bg-white/15 transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <button type="button" className="text-white font-semibold text-sm hover:text-gold transition-colors" onClick={() => { setYear(today.getFullYear()); setMonth(today.getMonth()) }} title="Jump to today">
          {MONTHS[month]} {year}
        </button>
        <button type="button" onClick={nextMonth} className="w-7 h-7 rounded-lg flex items-center justify-center text-white/70 hover:bg-white/15 transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 border-b border-slate-100 bg-surface">
        {DAYS_SHORT.map((d) => (
          <div key={d} className="text-center text-xs font-semibold text-slate-400 py-2">{d}</div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 p-2 gap-y-0.5">
        {cells.map((day, idx) => {
          if (!day) return <div key={`e-${idx}`} />
          const dis  = disabled(day)
          const sel  = isSel(day)
          const tod  = isTodayDay(day)
          const rang = inRange(day)
          const rs   = isRangeS(day)
          const re   = isRangeE(day)
          const endpoint = sel || rs || re

          return (
            <button
              key={day}
              type="button"
              disabled={dis}
              onClick={() => !dis && onChange(toYMD(new Date(year, month, day)))}
              className={`
                relative flex items-center justify-center h-8 w-full text-xs transition-all duration-100
                ${rang ? 'bg-[#0B2545]/8' : ''}
                ${rs ? 'rounded-l-lg' : ''} ${re ? 'rounded-r-lg' : ''}
                ${!endpoint && !dis ? 'hover:rounded-lg hover:bg-slate-100 cursor-pointer' : ''}
                ${dis ? 'cursor-not-allowed' : ''}
              `}
            >
              <span
                className="w-7 h-7 flex items-center justify-center rounded-lg z-10 text-xs"
                style={endpoint ? { background: '#0B2545' } : {}}
              >
                <span className={
                  endpoint ? 'text-white font-semibold'
                  : dis ? 'text-slate-300'
                  : rang ? 'text-navy font-medium'
                  : tod ? 'text-[#C9A84C] font-semibold'
                  : 'text-slate-700'
                }>
                  {day}
                </span>
              </span>
              {tod && !endpoint && (
                <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-gold" />
              )}
            </button>
          )
        })}
      </div>

      {/* Today shortcut */}
      <div className="px-3 pb-3 pt-1">
        <button
          type="button"
          onClick={() => onChange(toYMD(today))}
          className="w-full py-1.5 text-xs font-semibold text-navy/60 hover:text-navy hover:bg-surface rounded-lg transition-colors"
        >
          Today
        </button>
      </div>
    </div>
  )
}

// ── DatePicker — trigger + portal panel ───────────────────────────────────────

interface DatePickerProps {
  value: string
  onChange: (ymd: string) => void
  placeholder?: string
  minDate?: string
  maxDate?: string
  rangeStart?: string
  rangeEnd?: string
  error?: boolean
  disabled?: boolean
  className?: string
  size?: 'sm' | 'md'
}

export default function DatePicker({
  value, onChange, placeholder = 'Select date',
  minDate, maxDate, rangeStart, rangeEnd,
  error = false, disabled = false, className = '', size = 'md',
}: DatePickerProps) {
  const [open, setOpen]   = useState(false)
  const [pos, setPos]     = useState({ top: 0, left: 0, flip: false })
  const triggerRef        = useRef<HTMLButtonElement>(null)

  const formatted = value
    ? new Date(value + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
    : ''

  const measure = useCallback(() => {
    if (!triggerRef.current) return
    const r = triggerRef.current.getBoundingClientRect()
    const panelH = 360
    const flip = r.bottom + panelH + 8 > window.innerHeight && r.top > panelH + 8
    setPos({ top: flip ? r.top - panelH - 6 : r.bottom + 6, left: r.left, flip })
  }, [])

  const toggle = () => {
    if (disabled) return
    if (!open) measure()
    setOpen((o) => !o)
  }

  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => {
      if (triggerRef.current && !triggerRef.current.closest('[data-datepicker]')?.contains(e.target as Node)) {
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

  const padY     = size === 'sm' ? 'py-1.5' : 'py-2.5'
  const padX     = size === 'sm' ? 'px-2.5' : 'px-3'
  const textSize = size === 'sm' ? 'text-xs' : 'text-sm'
  const iconSize = size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4'

  return (
    <div data-datepicker="" className={`relative ${className}`}>
      {/* Wrapper row — not a button so we can nest a clear button inside */}
      <div
        className={`
          w-full flex items-center gap-2 border rounded-lg bg-white
          ${padX} ${padY}
          transition-all duration-150
          ${error
            ? 'border-red-400 bg-red-50'
            : open
              ? 'border-[#0B2545] ring-2 ring-[#0B2545]/20'
              : 'border-slate-200 hover:border-[#0B2545]/40'}
          ${disabled ? 'opacity-50' : ''}
        `}
      >
        {/* Main trigger area */}
        <button
          ref={triggerRef}
          type="button"
          disabled={disabled}
          onClick={toggle}
          className={`flex items-center gap-2 flex-1 min-w-0 text-left ${textSize} ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className={`shrink-0 ${iconSize} ${error ? 'text-red-400' : 'text-slate-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span className={`flex-1 truncate ${!value ? 'text-slate-400' : 'text-navy font-medium'}`}>
            {formatted || placeholder}
          </span>
        </button>
        {/* Clear button — sibling, not nested */}
        {value && !disabled && (
          <button
            type="button"
            onClick={() => onChange('')}
            className="shrink-0 text-slate-300 hover:text-slate-500 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {open && createPortal(
        <div
          className="fixed z-[9999]"
          style={{ top: pos.top, left: pos.left }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <CalendarPanel
            value={value}
            onChange={(ymd) => { onChange(ymd); setOpen(false) }}
            minDate={minDate}
            maxDate={maxDate}
            rangeStart={rangeStart}
            rangeEnd={rangeEnd}
          />
        </div>,
        document.body
      )}
    </div>
  )
}
