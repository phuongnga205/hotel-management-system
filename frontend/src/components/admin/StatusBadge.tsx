// ---------------------------------------------------------------------------
// StatusBadge — generic pill+dot badge driven by a config record
// ---------------------------------------------------------------------------

export type StatusConfig = Record<string, { label: string; bg: string; text: string; dot: string }>

export const StatusBadge = ({ status, config }: { status: string; config: StatusConfig }) => {
  const cfg = config[status] ?? { label: status, bg: 'bg-slate-100', text: 'text-slate-500', dot: 'bg-slate-400' }
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${cfg.bg} ${cfg.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${cfg.dot}`} />
      {cfg.label}
    </span>
  )
}

export const USER_STATUS_CONFIG: StatusConfig = {
  ACTIVE:   { label: 'Active',   bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-400' },
  INACTIVE: { label: 'Inactive', bg: 'bg-slate-100',  text: 'text-slate-500',   dot: 'bg-slate-400' },
}

export const EMAIL_LOG_STATUS_CONFIG: StatusConfig = {
  PENDING: { label: 'Pending', bg: 'bg-amber-50',   text: 'text-amber-700',   dot: 'bg-amber-400' },
  SENT:    { label: 'Sent',    bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-400' },
  FAILED:  { label: 'Failed',  bg: 'bg-red-50',     text: 'text-red-600',     dot: 'bg-red-400' },
}

export const REVIEW_STATUS_CONFIG: StatusConfig = {
  PUBLISHED: { label: 'Published', bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-400' },
  REMOVED:   { label: 'Removed',   bg: 'bg-slate-100',  text: 'text-slate-500',   dot: 'bg-slate-400' },
}
