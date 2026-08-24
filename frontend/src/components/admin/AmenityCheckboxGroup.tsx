import type { Amenity } from '../../api/types'

// ---------------------------------------------------------------------------
// AmenityCheckboxGroup - danh sach checkbox chon tien nghi, dung chung cho
// ca man tao va sua phong (tranh dung lai JSX y het o 2 file).
// ---------------------------------------------------------------------------

interface AmenityCheckboxGroupProps {
  amenities: Amenity[]
  selectedIds: string[]
  onToggle: (amenityId: string) => void
  emptyLabel: string
}

export const AmenityCheckboxGroup = ({ amenities, selectedIds, onToggle, emptyLabel }: AmenityCheckboxGroupProps) => {
  if (amenities.length === 0) {
    return <p className="text-sm text-slate-400">{emptyLabel}</p>
  }

  return (
    <div className="flex flex-wrap gap-2">
      {amenities.map((amenity) => {
        const checked = selectedIds.includes(amenity.id)
        return (
          <label
            key={amenity.id}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium cursor-pointer transition-colors ${
              checked ? 'border-navy bg-navy text-white' : 'border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <input type="checkbox" checked={checked} onChange={() => onToggle(amenity.id)} className="sr-only" />
            {amenity.name}
          </label>
        )
      })}
    </div>
  )
}
