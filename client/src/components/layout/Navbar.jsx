import { NavLink, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { useAuth } from '../../hooks/useAuth'

const navItems = [
  { to: '/dashboard',    label: 'Accueil' },
  { to: '/growth',       label: 'Croissance' },
  { to: '/vaccination',  label: 'Vaccination' },
  { to: '/agenda',       label: 'Agenda' },
  { to: '/consultation', label: 'Consultation' },
  { to: '/petitguide',   label: 'PetitGuide IA' },
]

export default function Navbar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-6 h-[70px] flex items-center justify-between gap-6">

        {/* Logo */}
        <button onClick={() => navigate('/dashboard')} className="flex items-center gap-2 shrink-0">
          <svg width="38" height="38" viewBox="0 0 38 38" fill="none" aria-hidden="true">
            <rect x="15" y="4"  width="8" height="30" rx="4" fill="#22c55e"/>
            <rect x="4"  y="15" width="30" height="8" rx="4" fill="#3b82f6"/>
            <rect x="15" y="4"  width="8" height="30" rx="4" fill="url(#crossgrad)" opacity="0.9"/>
            <defs>
              <linearGradient id="crossgrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#22c55e"/>
                <stop offset="100%" stopColor="#3b82f6"/>
              </linearGradient>
            </defs>
          </svg>
        </button>

        {/* Nav — desktop */}
        <nav className="hidden md:flex items-center gap-6 flex-1 justify-center" aria-label="Navigation">
          {navItems.map(({ to, label }) => (
            <NavLink key={to} to={to}
              className={({ isActive }) =>
                `text-sm font-medium transition-colors ${
                  isActive ? 'text-blue-600' : 'text-gray-600 hover:text-blue-500'
                }`
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Right */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => navigate('/children/new')}
            className="hidden sm:block px-5 py-2.5 bg-green-500 hover:bg-green-600 text-white text-sm font-semibold rounded-full transition-all shadow-md hover:shadow-lg"
          >
            + Ajouter un enfant
          </button>

          {/* User */}
          <div className="relative group">
            <button className="w-9 h-9 rounded-full bg-blue-600 text-white text-sm font-bold flex items-center justify-center hover:bg-blue-700 transition-colors">
              {user?.email?.[0]?.toUpperCase()}
            </button>
            <div className="absolute right-0 top-full mt-2 w-52 bg-white rounded-xl shadow-xl border border-gray-100 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
              <div className="px-4 py-3 border-b border-gray-100">
                <p className="text-xs text-gray-400">Connecté en tant que</p>
                <p className="text-sm font-semibold text-gray-800 truncate mt-0.5">{user?.email}</p>
              </div>
              <button onClick={() => { logout(); navigate('/login') }}
                className="w-full text-left px-4 py-3 text-sm text-red-500 hover:bg-red-50 rounded-b-xl transition-colors">
                🚪 Déconnexion
              </button>
            </div>
          </div>

          {/* Hamburger */}
          <button className="md:hidden w-9 h-9 flex items-center justify-center rounded-lg hover:bg-gray-100"
            onClick={() => setMenuOpen(o => !o)}>
            {menuOpen ? '✕' : '☰'}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden border-t border-gray-100 bg-white px-4 py-3 space-y-1">
          {navItems.map(({ to, label }) => (
            <NavLink key={to} to={to} onClick={() => setMenuOpen(false)}
              className={({ isActive }) =>
                `block px-3 py-2.5 rounded-lg text-sm font-medium ${
                  isActive ? 'text-blue-600 bg-blue-50' : 'text-gray-600 hover:bg-gray-50'
                }`
              }>
              {label}
            </NavLink>
          ))}
          <button onClick={() => { navigate('/children/new'); setMenuOpen(false) }}
            className="w-full mt-2 py-2.5 bg-green-500 text-white text-sm font-semibold rounded-full">
            + Ajouter un enfant
          </button>
        </div>
      )}
    </header>
  )
}
