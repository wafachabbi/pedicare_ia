import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { pediatresService } from '../../services/appointments.service'
import LoadingSpinner from '../../components/ui/LoadingSpinner'

export const formatAge = (dateOfBirth) => {
  const months = Math.floor((Date.now() - new Date(dateOfBirth)) / (1000 * 60 * 60 * 24 * 30))
  return months < 24 ? `${months} mois` : `${Math.floor(months / 12)} ans`
}

export default function PediatrePatientsPage() {
  const [patients, setPatients] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')

  useEffect(() => {
    pediatresService.patients()
      .then(res => setPatients(res.data.data))
      .catch(() => setError('Erreur lors du chargement des patients'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <LoadingSpinner />

  const visible = patients.filter(p => p.firstName.toLowerCase().includes(search.trim().toLowerCase()))

  return (
    <div className="max-w-4xl mx-auto">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-sky-500 to-violet-400 p-8 mb-8 shadow-xl shadow-sky-200 dark:shadow-sky-900/30">
        <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="relative">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-4xl">👶</span>
            <h1 className="text-3xl font-bold text-white">Mes patients</h1>
          </div>
          <p className="text-sky-100 text-sm">{patients.length} enfant{patients.length !== 1 ? 's' : ''} suivi{patients.length !== 1 ? 's' : ''} (rendez-vous ou vaccination assignés)</p>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl text-red-600 dark:text-red-400 text-sm">{error}</div>
      )}

      {patients.length > 0 && (
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 Rechercher un patient..."
          className="w-full mb-6 px-4 py-3 rounded-2xl border-2 border-gray-100 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:border-sky-400 transition-colors" />
      )}

      {patients.length === 0 && !error && (
        <div className="text-center py-20 bg-white dark:bg-slate-800 rounded-3xl border-2 border-dashed border-gray-200 dark:border-slate-700">
          <div className="text-6xl mb-4">👶</div>
          <p className="text-gray-500 dark:text-gray-400 font-medium mb-2">Aucun patient pour l'instant</p>
          <p className="text-gray-400 dark:text-gray-500 text-sm">Un enfant apparaît ici dès qu'un parent vous assigne un rendez-vous ou une vaccination</p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {visible.map((p, i) => (
          <motion.div key={p._id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Link to={`/pediatre/patients/${p._id}`}
              className="flex items-center gap-4 bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 p-5 hover:shadow-lg hover:border-sky-200 dark:hover:border-sky-800 transition-all">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-sky-400 to-violet-400 flex items-center justify-center text-xl shadow-md shrink-0">
                {p.gender === 'F' ? '👧' : '👦'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-800 dark:text-gray-100 truncate">{p.firstName}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {formatAge(p.dateOfBirth)}{p.bloodType && p.bloodType !== 'Inconnu' ? ` · 🩸 ${p.bloodType}` : ''}
                </p>
              </div>
              <span className="text-gray-300 dark:text-slate-600">›</span>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
