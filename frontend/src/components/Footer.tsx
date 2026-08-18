import { Link } from 'react-router-dom'

export const Footer = () => {
  return (
    <footer className="bg-[#0b162c] text-gray-300 py-12 px-8 font-sans mt-auto">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8">
        <div className="md:col-span-2 pr-8">
          <Link to="/" className="text-xl font-serif font-bold text-white mb-4 flex items-center gap-2">
            <span className="text-[#eab308]">✨</span> Grandeur
          </Link>
          <p className="text-sm leading-relaxed text-gray-400">
            Award-winning luxury hotel in the heart of the city. Crafting unforgettable experiences since 2010.
          </p>
        </div>

        <div>
          <h4 className="text-white font-semibold mb-4 text-sm tracking-wider uppercase">Quick Links</h4>
          <ul className="space-y-3 text-sm text-gray-400">
            <li><Link to="/rooms" className="hover:text-white transition-colors">Rooms & Suites</Link></li>
            <li><Link to="/dining" className="hover:text-white transition-colors">Dining</Link></li>
            <li><Link to="/spa" className="hover:text-white transition-colors">Spa & Wellness</Link></li>
            <li><Link to="/events" className="hover:text-white transition-colors">Events</Link></li>
            <li><Link to="/contact" className="hover:text-white transition-colors">Contact</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="text-white font-semibold mb-4 text-sm tracking-wider uppercase">Contact</h4>
          <ul className="space-y-3 text-sm text-gray-400">
            <li>1 Grandeur Boulevard, City Center</li>
            <li>+1 (800) GRANDEUR</li>
            <li>reservations@grandeur.com</li>
          </ul>
        </div>
      </div>

      <div className="max-w-7xl mx-auto mt-12 pt-8 border-t border-gray-800 text-sm text-gray-500 text-center">
        © 2026 Grandeur Hotel. All rights reserved.
      </div>
    </footer>
  )
}
