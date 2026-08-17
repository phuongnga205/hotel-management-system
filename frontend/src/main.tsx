import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ConfigProvider } from 'antd'
import './i18n'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* TODO: thay theme token khi có style guide chính thức */}
    <ConfigProvider>
      <App />
    </ConfigProvider>
  </StrictMode>,
)
