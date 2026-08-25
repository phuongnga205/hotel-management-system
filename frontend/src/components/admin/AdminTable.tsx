import type { ReactNode } from 'react'

// ---------------------------------------------------------------------------
// AdminTable - shell dung chung cho moi bang admin (rooms/bookings/users/
// email-logs/booking-history...) thay vi moi trang tu ve lai <table> giong
// het nhau. Chi truyen vao cot + du lieu, khong tu quan ly loading/pagination
// (2 viec do van khac nhau tuy trang, xem AdminListPage cho phan chung do).
// ---------------------------------------------------------------------------

export interface AdminTableColumn<T> {
  key: string
  // ReactNode (khong chi string) de cac trang co the nhet nut sap xep tang/
  // giam vao canh ten cot (vd Price/Capacity o AdminRoomListPage).
  header: ReactNode
  render: (row: T) => ReactNode
  className?: string
}

interface AdminTableProps<T> {
  columns: AdminTableColumn<T>[]
  rows: T[]
  rowKey: (row: T) => string
  // Optional - khi truyen vao, moi dong co the click duoc (vd mo modal chi
  // tiet) va co hover/cursor rieng de goi y dieu do. Khong truyen thi dong
  // giu nguyen hanh vi cu (chi hover doi mau nen, khong click duoc).
  onRowClick?: (row: T) => void
}

export function AdminTable<T>({ columns, rows, rowKey, onRowClick }: AdminTableProps<T>) {
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
            <tr
              key={rowKey(row)}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={`border-b border-slate-50 hover:bg-surface transition-colors ${i % 2 === 1 ? 'bg-slate-50/30' : ''} ${onRowClick ? 'cursor-pointer' : ''}`}
            >
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
