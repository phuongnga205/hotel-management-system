import type { ReactNode } from 'react'

// ---------------------------------------------------------------------------
// AdminTable - shell dung chung cho moi bang admin (rooms/bookings/users/
// email-logs/booking-history...) thay vi moi trang tu ve lai <table> giong
// het nhau. Chi truyen vao cot + du lieu, khong tu quan ly loading/pagination
// (2 viec do van khac nhau tuy trang, xem AdminListPage cho phan chung do).
// ---------------------------------------------------------------------------

export interface AdminTableColumn<T> {
  key: string
  header: string
  render: (row: T) => ReactNode
  className?: string
}

interface AdminTableProps<T> {
  columns: AdminTableColumn<T>[]
  rows: T[]
  rowKey: (row: T) => string
}

export function AdminTable<T>({ columns, rows, rowKey }: AdminTableProps<T>) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-100 text-left">
            {columns.map((c) => (
              <th key={c.key} className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={rowKey(row)} className={`border-b border-slate-50 hover:bg-surface transition-colors ${i % 2 === 1 ? 'bg-slate-50/30' : ''}`}>
              {columns.map((c) => (
                <td key={c.key} className={`px-4 py-3 ${c.className ?? ''}`}>
                  {c.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
