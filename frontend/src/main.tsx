import { StrictMode } from 'react'
import type { ReactNode, ErrorInfo } from 'react'
import { createRoot } from 'react-dom/client'
import { ConfigProvider } from 'antd'
import { RouterProvider } from 'react-router-dom'
import './i18n'
import './index.css'
import 'react-toastify/dist/ReactToastify.css'
import { router } from './router'
import { ToastContainer } from 'react-toastify'
import React from 'react'
import { colors, withAlpha } from './tokens/colors'

interface ErrorBoundaryProps {
  children: ReactNode
}

interface ErrorBoundaryState {
  error: Error | null
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { error: null }
  }
  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error }
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(error, info)
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 20, color: colors.danger, background: withAlpha(colors.danger, 0.08) }}>
          <h2>Oops! Đã có lỗi xảy ra ở giao diện:</h2>
          <pre style={{ whiteSpace: 'pre-wrap' }}>{this.state.error.toString()}</pre>
          <pre style={{ whiteSpace: 'pre-wrap' }}>{this.state.error.stack}</pre>
        </div>
      )
    }
    return this.props.children
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <ConfigProvider
        theme={{
          token: {
            colorPrimary: colors.navy,
            colorLink: colors.navy,
            colorLinkHover: colors.navyLight,
          },
        }}
      >
        <RouterProvider router={router} />
        <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} />
      </ConfigProvider>
    </ErrorBoundary>
  </StrictMode>,
)
