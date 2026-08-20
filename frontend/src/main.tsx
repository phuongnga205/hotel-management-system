import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ConfigProvider } from 'antd'
import { RouterProvider } from 'react-router-dom'
import './i18n'
import './index.css'
import 'react-toastify/dist/ReactToastify.css'
import { router } from './router'
import { ToastContainer } from 'react-toastify'
import React from 'react'

class ErrorBoundary extends React.Component<{children: React.ReactNode}, {error: any}> {
  constructor(props: any) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(error: any) { return { error }; }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 20, color: 'red', background: '#fee' }}>
          <h2>Oops! Đã có lỗi xảy ra ở giao diện:</h2>
          <pre style={{ whiteSpace: 'pre-wrap' }}>{this.state.error.toString()}</pre>
          <pre style={{ whiteSpace: 'pre-wrap' }}>{this.state.error.stack}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <ConfigProvider
        theme={{
          token: {
            colorPrimary: '#0B2545',
            colorLink: '#0B2545',
            colorLinkHover: '#1A3A5C',
          },
        }}
      >
        <RouterProvider router={router} />
        <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} />
      </ConfigProvider>
    </ErrorBoundary>
  </StrictMode>,
)
