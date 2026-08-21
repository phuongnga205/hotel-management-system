import { Spin } from 'antd'
import { useTranslation } from 'react-i18next'

interface PageLoaderProps {
  // true (mac dinh): chiem toi thieu 60vh, dung cho loading toan trang.
  // false: chi chiem khong gian vua du, dung khi nhung vao trong 1 khu vuc
  // nho hon (vi du: dang tai lai 1 bang trong khi phan con lai cua trang
  // van hien) - day la loader DUY NHAT dung trong toan bo app, khong dung
  // component Spinner rieng cho cac truong hop nay.
  fullPage?: boolean
}

export const PageLoader = ({ fullPage = true }: PageLoaderProps) => {
  const { t } = useTranslation('common')

  return (
    <div className={`flex flex-col justify-center items-center gap-4 animate-pulse ${fullPage ? 'min-h-[60vh]' : 'py-10'}`}>
      <div className="relative">
        <Spin size="large" className="custom-spin" />
      </div>
      <p className="text-navy font-medium text-lg tracking-wide">{t('common.loading')}</p>
    </div>
  )
}
