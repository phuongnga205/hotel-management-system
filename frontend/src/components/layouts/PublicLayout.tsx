import { Outlet } from 'react-router-dom'
import { Header } from '../Header'
import { Footer } from '../Footer'

export const PublicLayout = () => {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      <main className="flex-grow w-full flex flex-col">
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}
