interface AuthCardProps {
  title: string
  subtitle?: string
  children: React.ReactNode
}

export default function AuthCard({ title, subtitle, children }: AuthCardProps) {
  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-12 bg-surface">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div
            className="text-gold text-2xl font-bold mb-2"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            ✦
          </div>
          <h1
            className="text-2xl font-bold text-navy"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            {title}
          </h1>
          {subtitle && <p className="text-slate-500 text-sm mt-1">{subtitle}</p>}
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8">
          {children}
        </div>
      </div>
    </div>
  )
}
