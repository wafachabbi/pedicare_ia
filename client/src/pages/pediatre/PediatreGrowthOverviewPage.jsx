import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import api from '../../services/api'
import LoadingSpinner from '../../components/ui/LoadingSpinner'

// Calcule l'âge lisible depuis une date de naissance
const formatAge = (dob) => {
  const diff = Date.now() - new Date(dob).getTime()
  const months = Math.floor(diff / (1000 * 60 * 60 * 24 * 30.44))
  if (months < 24) return `${months} mois`
  return `${Math.floor(months / 12)} ans`
}

const CHART_TABS = [
  { key: 'weight', label: 'Poids', color: '#3b82f6', unit: 'kg' },
  { key: 'height', label: 'Taille', color: '#10b981', unit: 'cm' },
  { key: 'headCircumference', label: 'PC', color: '#8b5cf6', unit: 'cm' }
]

// Carte patient avec mini-graphique et dernière mesure
function PatientGrowthCard({ child, measurements }) {
  const [activeTab, setActiveTab] = useState('weight')

  const sorted = [...measurements].sort((a, b) => new Date(a.date) - new Date(b.date))
  const latest = sorted.length ? sorted[sorted.length - 1] : null

  const chartData = sorted.map(m => ({
    date: new Date(m.date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }),
    weight: m.weight ?? null,
    height: m.height ?? null,
    headCircumference: m.headCircumference ?? null
  }))

  const tab = CHART_TABS.find(t => t.key === activeTab)
  const hasChart = chartData.filter(d => d[activeTab] !== null).length >= 2

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-slate-800 rounded-3xl border border-gray-100 dark:border-slate-700 overflow-hidden shadow-sm hover:shadow-lg transition-shadow"
    >
      {/* En-tête patient */}
      <div className="bg-gradient-to-r from-sky-500 to-teal-400 px-5 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{child.gender === 'F' ? '👧' : '👦'}</span>
          <div>
            <h3 className="text-white font-bold text-lg leading-tight">{child.firstName}</h3>
            <p className="text-sky-100 text-xs">{formatAge(child.dateOfBirth)}</p>
          </div>
        </div>
        <Link
          to={`/pediatre/patients/${child._id}/measurements`}
          className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 text-white text-xs font-semibold px-3 py-1.5 rounded-xl transition-colors border border-white/30"
        >
          📏 Saisir
        </Link>
      </div>

      <div className="p-5">
        {measurements.length === 0 ? (
          <div className="text-center py-6">
            <p className="text-3xl mb-2">📏</p>
            <p className="text-gray-400 dark:text-gray-500 text-sm">Aucune mesure</p>
            <Link
              to={`/pediatre/patients/${child._id}/measurements`}
              className="inline-block mt-3 text-xs text-sky-500 hover:underline font-medium"
            >
              + Saisir la première mesure
            </Link>
          </div>
        ) : (
          <>
            {/* Dernière mesure */}
            {latest && (
              <div className="flex gap-3 mb-4 flex-wrap">
                {latest.weight && (
                  <div className="flex-1 min-w-[70px] bg-blue-50 dark:bg-blue-900/20 rounded-xl p-2.5 text-center">
                    <p className="text-xs text-blue-400 font-semibold uppercase tracking-wide">Poids</p>
                    <p className="text-base font-bold text-blue-700 dark:text-blue-300">{latest.weight}<span className="text-xs font-normal ml-0.5">kg</span></p>
                  </div>
                )}
                {latest.height && (
                  <div className="flex-1 min-w-[70px] bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-2.5 text-center">
                    <p className="text-xs text-emerald-400 font-semibold uppercase tracking-wide">Taille</p>
                    <p className="text-base font-bold text-emerald-700 dark:text-emerald-300">{latest.height}<span className="text-xs font-normal ml-0.5">cm</span></p>
                  </div>
                )}
                {latest.headCircumference && (
                  <div className="flex-1 min-w-[70px] bg-violet-50 dark:bg-violet-900/20 rounded-xl p-2.5 text-center">
                    <p className="text-xs text-violet-400 font-semibold uppercase tracking-wide">PC</p>
                    <p className="text-base font-bold text-violet-700 dark:text-violet-300">{latest.headCircumference}<span className="text-xs font-normal ml-0.5">cm</span></p>
                  </div>
                )}
              </div>
            )}

            {/* Onglets mini-graphique */}
            <div className="flex gap-1.5 mb-3">
              {CHART_TABS.map(t => (
                <button
                  key={t.key}
                  onClick={() => setActiveTab(t.key)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                    activeTab === t.key ? 'text-white shadow-sm' : 'bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-gray-400'
                  }`}
                  style={activeTab === t.key ? { backgroundColor: t.color } : {}}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {!hasChart ? (
              <p className="text-xs text-gray-400 dark:text-gray-500 text-center py-4">
                {chartData.filter(d => d[activeTab] !== null).length === 0
                  ? `Aucune donnée ${tab.label.toLowerCase()}`
                  : 'Ajoutez ≥ 2 mesures pour la courbe'}
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={120}>
                <LineChart data={chartData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="date" tick={{ fontSize: 9 }} stroke="#9ca3af" />
                  <YAxis tick={{ fontSize: 9 }} stroke="#9ca3af" />
                  <Tooltip
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 2px 12px rgba(0,0,0,0.1)', fontSize: '11px' }}
                    formatter={v => [`${v} ${tab.unit}`, tab.label]}
                  />
                  <Line
                    type="monotone"
                    dataKey={activeTab}
                    stroke={tab.color}
                    strokeWidth={2}
                    dot={{ fill: tab.color, r: 3 }}
                    activeDot={{ r: 5 }}
                    connectNulls={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}

            <p className="text-xs text-gray-400 dark:text-gray-500 mt-3 text-right">
              {measurements.length} mesure{measurements.length > 1 ? 's' : ''} · dernière le{' '}
              {new Date(latest.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
            </p>
          </>
        )}
      </div>
    </motion.div>
  )
}

export default function PediatreGrowthOverviewPage() {
  const [data, setData]       = useState(null)   // { children, measurements }
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState('')
  const [search, setSearch]   = useState('')

  useEffect(() => {
    api.get('/pediatre/croissance')
      .then(res => setData(res.data.data))
      .catch(() => setError('Impossible de charger les données de croissance.'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <LoadingSpinner />

  if (error) {
    return (
      <div className="p-8 text-center">
        <p className="text-4xl mb-3">⚠️</p>
        <p className="text-red-500 text-sm">{error}</p>
      </div>
    )
  }

  const { children = [], measurements = [] } = data || {}

  // Grouper les mesures par enfant
  const measurementsByChild = {}
  for (const m of measurements) {
    const cid = String(m.childId)
    if (!measurementsByChild[cid]) measurementsByChild[cid] = []
    measurementsByChild[cid].push(m)
  }

  const filtered = children.filter(c =>
    c.firstName.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-teal-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 p-6">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-sky-500 to-teal-400 p-8 mb-8 shadow-xl shadow-sky-200 dark:shadow-sky-900/30">
          <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/4" />
          <div className="absolute bottom-0 left-0 w-28 h-28 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/4" />
          <div className="relative">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-4xl">📊</span>
              <div>
                <h1 className="text-3xl font-bold text-white">Courbes de croissance</h1>
                <p className="text-sky-100 text-sm mt-0.5">Vue d'ensemble de tous vos patients</p>
              </div>
            </div>
            <p className="text-sky-100 text-sm mt-2">
              {children.length} patient{children.length !== 1 ? 's' : ''} suivi{children.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>

        {/* Barre de recherche */}
        {children.length > 0 && (
          <div className="mb-6">
            <input
              type="text"
              placeholder="🔍  Rechercher un patient..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full max-w-sm px-5 py-3 rounded-2xl border-2 border-gray-100 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-800 dark:text-gray-100 focus:outline-none focus:border-sky-400 transition-colors text-sm shadow-sm"
            />
          </div>
        )}

        {/* État vide */}
        {children.length === 0 && (
          <div className="text-center py-20 bg-white dark:bg-slate-800 rounded-3xl border-2 border-dashed border-gray-200 dark:border-slate-700">
            <div className="text-6xl mb-4">📊</div>
            <p className="text-gray-500 dark:text-gray-400 font-medium mb-2">Aucun patient suivi</p>
            <p className="text-gray-400 dark:text-gray-500 text-sm mb-6">
              Les patients apparaissent ici dès qu'un rendez-vous ou une vaccination leur est assigné.
            </p>
            <Link
              to="/pediatre/patients"
              className="px-6 py-3 bg-gradient-to-r from-sky-500 to-teal-400 text-white font-semibold rounded-2xl hover:shadow-lg transition-all text-sm"
            >
              Voir mes patients
            </Link>
          </div>
        )}

        {/* Grille des patients */}
        {filtered.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {filtered.map((child, i) => (
              <motion.div key={child._id} transition={{ delay: i * 0.05 }}>
                <PatientGrowthCard
                  child={child}
                  measurements={measurementsByChild[String(child._id)] || []}
                />
              </motion.div>
            ))}
          </div>
        )}

        {/* Aucun résultat de recherche */}
        {children.length > 0 && filtered.length === 0 && (
          <div className="text-center py-16 text-gray-400 dark:text-gray-500">
            <p className="text-4xl mb-3">🔍</p>
            <p>Aucun patient ne correspond à « {search} »</p>
          </div>
        )}
      </div>
    </div>
  )
}
