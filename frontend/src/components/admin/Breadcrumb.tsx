import { Link } from 'react-router-dom'

// ---------------------------------------------------------------------------
// Breadcrumb — nav trail for detail / edit / create pages
// ---------------------------------------------------------------------------

export const Breadcrumb = ({ items }: { items: { label: string; to?: string }[] }) => (
  <div className="flex items-center gap-2 text-sm text-slate-400">
    {items.map((item, i) => (
      <span key={i} className="flex items-center gap-2">
        {i > 0 && <span>/</span>}
        {item.to ? (
          <Link to={item.to} className="hover:text-navy transition-colors">{item.label}</Link>
        ) : (
          <span className="text-navy font-medium">{item.label}</span>
        )}
      </span>
    ))}
  </div>
)
