interface RoleBadgeProps {
  role: string
}

const CONFIG: Record<string, string> = {
  admin: 'bg-purple-50 text-purple-700',
  user: 'bg-slate-100 text-slate-700',
}

export default function RoleBadge({ role }: RoleBadgeProps) {
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full uppercase tracking-wide ${CONFIG[role] ?? 'bg-slate-100 text-slate-700'}`}>
      {role}
    </span>
  )
}
