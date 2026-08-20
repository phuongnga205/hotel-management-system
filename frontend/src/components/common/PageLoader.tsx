import { Spin } from 'antd'
import { useTranslation } from 'react-i18next'

export const PageLoader = () => {
  const { t } = useTranslation('common')

  return (
    <div className="min-h-[60vh] flex flex-col justify-center items-center gap-4 animate-pulse">
      <div className="relative">
        <Spin size="large" className="custom-spin" />
      </div>
      <p className="text-navy font-medium text-lg tracking-wide">{t('common.loading')}</p>
    </div>
  )
}
