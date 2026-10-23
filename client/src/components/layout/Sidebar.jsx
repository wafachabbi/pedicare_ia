import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { useAuth } from '../../hooks/useAuth'

const navItems = [
  { to: '/dashboard', icon: '🏠', label: 'Tableau de bord', match: ['/dashboard'] },
  { to: '/children', icon: '👶', label: 'Profils enfants', match: ['/children'] },
  { to: '/growth', icon: '📈', label: 'Croissance', match: ['/growth', '/measurements'] },
  { to: '/vaccination', icon: '💉', label: 'Vaccination', match: ['/vaccination', '/vaccinations'] },
  { to: '/agenda', icon: '📅', label: 'Agenda', match: ['/agenda', '/appointments'] },
  { to: '/documents', icon: '🗂️', label: 'Documents', match: ['/documents'] },
  { to: '/journal', icon: '📔', label: 'Journal', match: ['/journal'] },
  { to: '/timeline', icon: '🕐', label: 'Frise', match: ['/timeline'] },
  { to: '/consultation', icon: '🩺', label: 'Consultation', match: ['/consultation'] },
  { to: '/petitguide', icon: '✨', label: 'PetitGuide IA', match: ['/petitguide'] },
]

export default function Sidebar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'))

  useEffect(() => {
    if (dark) document.documentElement.classList.add('dark')
    else document.documentElement.classList.remove('dark')
  }, [dark])

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const isActive = (item) =>
    item.match.some(segment => location.pathname.includes(segment))

  return (
    <aside className="w-64 min-h-screen bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-r border-gray-100 dark:border-slate-700 flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-gray-100 dark:border-slate-700">
        <h1 className="text-xl font-bold text-mint-500">🏥 PediCare AI</h1>
        <p className="text-xs text-gray-400 mt-1 truncate">{user?.email}</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto" aria-label="Navigation principale">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={() =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                isActive(item)
                  ? 'bg-mint-100 dark:bg-mint-900/30 text-mint-700 dark:text-mint-400'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800'
              }`
            }
          >
            <span aria-hidden="true">{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-gray-100 dark:border-slate-700 space-y-1">
        <button
          onClick={() => setDark(d => !d)}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
          aria-label="Basculer le mode sombre"
        >
          <span aria-hidden="true">{dark ? '☀️' : '🌙'}</span>
          {dark ? 'Mode clair' : 'Mode sombre'}
        </button>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
        >
          <span aria-hidden="true">🚪</span>
          Déconnexion
        </button>
      </div>
    </aside>
  )
}
