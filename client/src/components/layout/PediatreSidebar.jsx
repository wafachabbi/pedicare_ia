import { NavLink, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { useAuth } from '../../hooks/useAuth'

const navItems = [
  { to: '/pediatre/dashboard', icon: '🏠', label: 'Tableau de bord' },
  { to: '/pediatre/profile', icon: '👨‍⚕️', label: 'Mon profil' },
  { to: '/pediatre/fiches', icon: '📋', label: 'Fiches partagées' },
  { to: '/pediatre/croissance', icon: '📊', label: 'Courbes de croissance' },
  { to: '/pediatre/vaccinations', icon: '💉', label: 'Suivi vaccinal' },
  { to: '/pediatre/notes', icon: '📝', label: 'Mes notes' },
]

export default function PediatreSidebar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'))

  useEffect(() => {
    if (dark) document.documentElement.classList.add('dark')
    else document.documentElement.classList.remove('dark')
  }, [dark])

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <aside className="w-64 min-h-screen bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-r border-gray-100 dark:border-slate-700 flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-gray-100 dark:border-slate-700">
        <h1 className="text-xl font-bold text-sky-500">🏥 PediCare AI</h1>
        <div className="mt-2">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">
            {user?.fullName || user?.email}
          </p>
          <span className="inline-block mt-1 text-xs bg-sky-100 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400 px-2 py-0.5 rounded-full">
            👨‍⚕️ Pédiatre
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto" aria-label="Navigation pédiatre">
        {navItems.map(({ to, icon, label }) => (
          <NavLink key={to} to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-400'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800'
              }`
            }
          >
            <span aria-hidden="true">{icon}</span>
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-gray-100 dark:border-slate-700 space-y-1">
        <button onClick={() => setDark(d => !d)}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
          aria-label="Basculer le mode sombre">
          <span aria-hidden="true">{dark ? '☀️' : '🌙'}</span>
          {dark ? 'Mode clair' : 'Mode sombre'}
        </button>
        <button onClick={handleLogout}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
          <span aria-hidden="true">🚪</span>
          Déconnexion
        </button>
      </div>
    </aside>
  )
}
