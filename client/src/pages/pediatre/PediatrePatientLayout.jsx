import { useState, useEffect } from 'react'
import { Link, NavLink, Outlet, useParams } from 'react-router-dom'
import { pediatresService } from '../../services/appointments.service'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import { formatAge } from './PediatrePatientsPage'

const TABS = [
  { to: 'milestones', icon: '🌱', label: 'Développement' },
  { to: 'measurements', icon: '📏', label: 'Carnet de croissance' },
  { to: 'medical-records', icon: '🚫', label: 'Allergies & Antécédents' },
  { to: 'journal', icon: '📔', label: 'Journal (lecture)' },
  { to: 'medical-contacts', icon: '🏥', label: 'Contacts (lecture)' }
]

// Fiche patient côté pédiatre : en-tête enfant + onglets réutilisant les pages des modules
export default function PediatrePatientLayout() {
  const { childId } = useParams()
  const [child, setChild] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    pediatresService.patients()
      .then(res => setChild(res.data.data.find(p => p._id === childId) || null))
      .catch(() => setChild(null))
      .finally(() => setLoading(false))
  }, [childId])

  if (loading) return <LoadingSpinner />

  if (!child) {
    return (
      <div className="text-center py-16 text-gray-400 dark:text-gray-500">
        <p className="text-4xl mb-3">🔒</p>
        <p>Ce patient n'est pas dans votre liste.</p>
        <Link to="/pediatre/patients" className="text-sky-500 text-sm underline mt-2 inline-block">Retour à mes patients</Link>
      </div>
    )
  }

  return (
    <div>
      <div className="max-w-3xl mx-auto mb-2">
        <Link to="/pediatre/patients" className="text-sm text-sky-600 dark:text-sky-400 hover:underline">← Mes patients</Link>
        <div className="flex items-center gap-3 mt-3">
          <span className="text-3xl">{child.gender === 'F' ? '👧' : '👦'}</span>
          <div>
            <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">{child.firstName}</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {formatAge(child.dateOfBirth)} · né{child.gender === 'F' ? 'e' : ''} le {new Date(child.dateOfBirth).toLocaleDateString('fr-FR')}
              {child.bloodType && child.bloodType !== 'Inconnu' ? ` · 🩸 ${child.bloodType}` : ''}
            </p>
          </div>
        </div>
        <nav className="flex gap-2 mt-5 overflow-x-auto" aria-label="Sections du dossier">
          {TABS.map(t => (
            <NavLink key={t.to} to={t.to}
              className={({ isActive }) => `whitespace-nowrap px-4 py-2 rounded-xl text-sm font-medium transition-colors ${isActive
                ? 'bg-sky-500 text-white shadow'
                : 'bg-white dark:bg-slate-800 text-gray-600 dark:text-gray-300 border border-gray-100 dark:border-slate-700 hover:border-sky-300'}`}>
              {t.icon} {t.label}
            </NavLink>
          ))}
        </nav>
      </div>
      <Outlet />
    </div>
  )
}
