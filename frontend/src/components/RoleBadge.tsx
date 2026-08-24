import { useTranslation } from 'react-i18next'
import type { UserRole } from '../api/types'

interface RoleBadgeProps {
  role: UserRole
}

const CONFIG: Record<UserRole, string> = {
  ADMIN: 'bg-purple-50 text-purple-700',
  USER: 'bg-slate-100 text-slate-700',
}

export default function RoleBadge({ role }: RoleBadgeProps) {
  const { t } = useTranslation('admin')
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full uppercase tracking-wide ${CONFIG[role] ?? 'bg-slate-100 text-slate-700'}`}>
      {t(`status.role.${role}`)}
    </span>
  )
}
