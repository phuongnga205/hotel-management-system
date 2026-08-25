import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

interface Props {
    eyebrow?: string
    title: string
    subtitle?: string
    action?: ReactNode
    // Nut "quay lai trang truoc" dung navigate(-1) (browser history that,
    // khong phai 1 route cha co dinh) - chi bat o cac trang detail/sub-flow
    // (vd chi tiet phong, tao/sua, thanh toan/review 1 booking cu the), KHONG
    // bat o cac trang la diem den chinh cua nav (Home, danh sach, Dashboard)
    // vi "quay lai" o do khong ro nghia.
    showBack?: boolean
}

export default function PageHeader({
    eyebrow,
    title,
    subtitle,
    action,
    showBack = false,
}: Props) {
    const navigate = useNavigate()
    const { t } = useTranslation('common')

    return (
        <div className="flex items-start justify-between gap-4 mb-8">
            <div>
                {showBack && (
                    <button
                        type="button"
                        onClick={() => navigate(-1)}
                        className="flex items-center gap-2 text-sm font-semibold text-slate-600 bg-white border border-slate-200 rounded-full pl-3 pr-4 py-2 hover:text-navy hover:border-navy/30 hover:bg-slate-50 transition-colors mb-4"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        {t('common.back')}
                    </button>
                )}

                {eyebrow && (
                    <p className="text-gold text-xs font-semibold uppercase tracking-widest mb-1">
                        {eyebrow}
                    </p>
                )}

                <h1
                    className="text-2xl font-bold text-navy"
                    style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                >
                    {title}
                </h1>

                {subtitle && (
                    <p className="text-slate-500 text-sm mt-1">{subtitle}</p>
                )}
            </div>

            {action && <div className="shrink-0">{action}</div>}
        </div>
    )
}
