import { Button, Space } from 'antd'
import { useTranslation } from 'react-i18next'

function App() {
  const { t } = useTranslation()

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-8">
      <h1 className="text-2xl font-semibold">{t('app.name')}</h1>
      <p className="text-gray-500">{t('app.setupDescription')}</p>

      <Space>
        <Button type="primary">{t('common.save')}</Button>
        <Button>{t('common.cancel')}</Button>
      </Space>

    </div>
  )
}

export default App
