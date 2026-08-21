// ---------------------------------------------------------------------------
// StatTile — KPI tile used in dashboards and stats pages
// ---------------------------------------------------------------------------

export const StatTile = ({
  label,
  value,
  sub,
  color,
}: {
  label: string
  value: string | number
  sub?: string
  color: string
}) => (
  <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
    <div className="flex items-center justify-between mb-2">
      <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide leading-tight">{label}</div>
      <div className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
    </div>
    <div className="text-2xl font-bold text-navy mb-1">{value}</div>
    {sub && <div className="text-xs text-slate-400">{sub}</div>}
  </div>
)
