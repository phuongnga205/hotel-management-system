import { useTranslation } from 'react-i18next'

// ---------------------------------------------------------------------------
// StatusBadge - generic pill+dot badge driven by a config record. `labelKey`
// tro toi 1 key trong namespace i18n 'admin' (vd 'status.room.ACTIVE') thay
// vi label cung, de nhan text luon di theo ngon ngu dang chon. Cac bang
// config theo tung loai status nam o `statusConfigs.ts` (tach rieng de file
// nay chi export component, tranh loi react-refresh/only-export-components).
// ---------------------------------------------------------------------------

export type StatusConfig = Record<string, { labelKey: string; bg: string; text: string; dot: string }>

export const StatusBadge = ({ status, config }: { status: string; config: StatusConfig }) => {
  const { t } = useTranslation('admin')
  const cfg = config[status] ?? { labelKey: '', bg: 'bg-slate-100', text: 'text-slate-500', dot: 'bg-slate-400' }
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${cfg.bg} ${cfg.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${cfg.dot}`} />
      {cfg.labelKey ? t(cfg.labelKey) : status}
    </span>
  )
}
