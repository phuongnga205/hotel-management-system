import { Button, Space } from 'antd'
import { useTranslation } from 'react-i18next'

function App() {
  const { t, i18n } = useTranslation()

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-8">
      <h1 className="text-2xl font-semibold">{t('app.name')}</h1>
      <p className="text-gray-500">
        Setup mẫu: Vite + React + Tailwind CSS + Ant Design + i18n (vi/en).
        Routes và style guide chính thức sẽ được bổ sung sau.
      </p>

      <Space>
        <Button type="primary">{t('common.save')}</Button>
        <Button>{t('common.cancel')}</Button>
      </Space>

      <Space>
        <Button
          type={i18n.language.startsWith('vi') ? 'primary' : 'default'}
          onClick={() => i18n.changeLanguage('vi')}
        >
          Tiếng Việt
        </Button>
        <Button
          type={i18n.language.startsWith('en') ? 'primary' : 'default'}
          onClick={() => i18n.changeLanguage('en')}
        >
          English
        </Button>
      </Space>
    </div>
  )
}

export default App
