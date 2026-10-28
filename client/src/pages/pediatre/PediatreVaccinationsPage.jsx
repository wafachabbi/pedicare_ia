import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import api from '../../services/api'
import LoadingSpinner from '../../components/ui/LoadingSpinner'

function computeAge(dateOfBirth) {
  const now = new Date()
  const dob = new Date(dateOfBirth)
  const months = (now.getFullYear() - dob.getFullYear()) * 12 + (now.getMonth() - dob.getMonth())
  if (months < 24) return `${months} mois`
  return `${Math.floor(months / 12)} ans`
}

export default function PediatreVaccinationsPage() {
  const [vaccinations, setVaccinations] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')

  useEffect(() => {
    api.get('/pediatre/vaccinations')
      .then(res => setVaccinations(res.data.data))
      .catch(() => setError('Erreur lors du chargement'))
      .finally(() => setLoading(false))
  }, [])

  const filtered = vaccinations.filter(v =>
    v.vaccineName?.toLowerCase().includes(search.toLowerCase()) ||
    v.childId?.firstName?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-500 to-teal-400 p-8 mb-8 shadow-xl">
        <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2" />
        <div className="relative">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-4xl">💉</span>
            <h1 className="text-3xl font-bold text-white">Suivi vaccinal</h1>
          </div>
          <p className="text-emerald-100 text-sm">
            {vaccinations.length} vaccination{vaccinations.length !== 1 ? 's' : ''} assignée{vaccinations.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Search */}
      {vaccinations.length > 0 && (
        <div className="mb-5">
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher par vaccin ou enfant..."
            className="w-full px-5 py-3 rounded-2xl border-2 border-gray-100 bg-white focus:outline-none focus:border-emerald-400 transition-colors text-gray-700 text-sm"
          />
        </div>
      )}

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-2xl text-red-600 text-sm">{error}</div>
      )}

      {loading ? (
        <div className="flex justify-center py-16"><LoadingSpinner size="lg" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-gray-200">
          <div className="text-6xl mb-4">💉</div>
          <p className="text-gray-500 font-medium mb-1">
            {search ? 'Aucun résultat' : 'Aucune vaccination assignée'}
          </p>
          <p className="text-gray-400 text-sm">
            {search ? 'Essayez un autre terme de recherche' : 'Les vaccinations vous seront assignées par les parents'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((v, i) => {
            const child = v.childId
            return (
              <motion.div
                key={v._id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="bg-white rounded-2xl border border-gray-100 p-5 flex items-center gap-4 hover:shadow-md hover:border-emerald-200 transition-all"
              >
                {/* Icon */}
                <div className="w-13 h-13 w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-400 flex items-center justify-center text-xl shadow shrink-0">
                  💉
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-800 text-base">{v.vaccineName}</p>
                  <div className="flex items-center gap-3 mt-1 flex-wrap">
                    <span className="text-sm text-gray-500">
                      📅 {new Date(v.administeredAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </span>
                    {v.lotNumber && (
                      <span className="text-xs bg-emerald-50 text-emerald-600 px-2.5 py-0.5 rounded-full font-medium">
                        Lot {v.lotNumber}
                      </span>
                    )}
                  </div>
                  {child && (
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="text-sm text-gray-400">
                        {child.gender === 'F' ? '👧' : '👦'} {child.firstName}
                      </span>
                      <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                        {computeAge(child.dateOfBirth)}
                      </span>
                    </div>
                  )}
                </div>

                {/* Date badge */}
                <div className="shrink-0 text-right">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex flex-col items-center justify-center">
                    <span className="text-emerald-700 font-bold text-base leading-none">
                      {new Date(v.administeredAt).getDate()}
                    </span>
                    <span className="text-emerald-500 text-xs leading-none mt-0.5">
                      {new Date(v.administeredAt).toLocaleDateString('fr-FR', { month: 'short' })}
                    </span>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}
