import { useTranslation } from 'react-i18next'

// ---------------------------------------------------------------------------
// ConfirmModal — reusable confirmation dialog (delete / reject / etc.)
// ---------------------------------------------------------------------------

export const ConfirmModal = ({
  open,
  title,
  desc,
  confirmLabel,
  danger = true,
  onConfirm,
  onCancel,
  children,
}: {
  open: boolean
  title: string
  desc?: string
  confirmLabel?: string
  danger?: boolean
  onConfirm: () => void
  onCancel: () => void
  children?: React.ReactNode
}) => {
  const { t } = useTranslation('common')
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy/50">
      <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full">
        {danger && (
          <div className="flex justify-center mb-3">
            <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>
          </div>
        )}
        <h3 className="font-bold text-navy text-lg text-center mb-1">{title}</h3>
        {desc && <p className="text-slate-500 text-sm text-center mb-4">{desc}</p>}
        {children && <div className="mb-4">{children}</div>}
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 py-2.5 text-sm font-semibold border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition-colors">
            {t('common.cancel')}
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 py-2.5 text-sm font-semibold rounded-xl transition-colors ${danger ? 'bg-danger text-white hover:opacity-90' : 'bg-navy text-white hover:opacity-90'}`}
          >
            {confirmLabel ?? t('common.confirm')}
          </button>
        </div>
      </div>
    </div>
  )
}
