import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts'
import { pediatreMeasurementsService } from '../../services/measurements.service'
import ConfirmModal from '../../components/ui/ConfirmModal'
import LoadingSpinner from '../../components/ui/LoadingSpinner'

const emptyForm = { date: '', weight: '', height: '', headCircumference: '' }

const TABS = [
  { key: 'weight',            label: 'Poids (kg)',              color: '#3b82f6', unit: 'kg',  icon: '⚖️' },
  { key: 'height',            label: 'Taille (cm)',             color: '#10b981', unit: 'cm',  icon: '📐' },
  { key: 'headCircumference', label: 'Périmètre crânien (cm)', color: '#8b5cf6', unit: 'cm',  icon: '🧠' }
]

export default function PediatreMeasurementsPage() {
  const { childId } = useParams()

  // ── État CRUD ──────────────────────────────────────────────────────────────
  const [measurements, setMeasurements] = useState([])
  const [loading, setLoading]           = useState(true)
  const [error, setError]               = useState('')
  const [showForm, setShowForm]         = useState(false)
  const [form, setForm]                 = useState(emptyForm)
  const [editId, setEditId]             = useState(null)
  const [formError, setFormError]       = useState('')
  const [saving, setSaving]             = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [activeTab, setActiveTab]       = useState('weight')

  // ── Chargement ─────────────────────────────────────────────────────────────
  const load = async () => {
    try {
      setLoading(true)
      setError('')
      const res = await pediatreMeasurementsService.getAll(childId)
      setMeasurements(res.data.data)
    } catch {
      setError('Impossible de charger les mesures.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [childId])

  // ── Formulaire ─────────────────────────────────────────────────────────────
  const openCreate = () => {
    setForm({ ...emptyForm, date: new Date().toISOString().slice(0, 10) })
    setEditId(null)
    setFormError('')
    setShowForm(true)
  }

  const openEdit = (m) => {
    setForm({
      date:               m.date.slice(0, 10),
      weight:             m.weight             ?? '',
      height:             m.height             ?? '',
      headCircumference:  m.headCircumference  ?? ''
    })
    setEditId(m._id)
    setFormError('')
    setShowForm(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.date) { setFormError('La date est requise.'); return }
    if (!form.weight && !form.height && !form.headCircumference) {
      setFormError('Au moins une mesure (poids, taille ou périmètre crânien) est requise.')
      return
    }
    setSaving(true)
    try {
      const payload = {
        date:              form.date,
        weight:            form.weight            ? parseFloat(form.weight)            : undefined,
        height:            form.height            ? parseFloat(form.height)            : undefined,
        headCircumference: form.headCircumference ? parseFloat(form.headCircumference) : undefined
      }
      if (editId) {
        const res = await pediatreMeasurementsService.update(childId, editId, payload)
        setMeasurements(m => m.map(x => x._id === editId ? res.data.data : x))
      } else {
        const res = await pediatreMeasurementsService.create(childId, payload)
        setMeasurements(m => [...m, res.data.data].sort((a, b) => new Date(a.date) - new Date(b.date)))
      }
      setShowForm(false)
    } catch (err) {
      setFormError(err.response?.data?.error?.message || 'Erreur lors de la sauvegarde.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    try {
      await pediatreMeasurementsService.delete(childId, deleteTarget)
      setMeasurements(m => m.filter(x => x._id !== deleteTarget))
    } catch {
      setError('Erreur lors de la suppression.')
    } finally {
      setDeleteTarget(null)
    }
  }

  // ── Données graphique ──────────────────────────────────────────────────────
  const chartData = measurements.map(m => ({
    date:              new Date(m.date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' }),
    weight:            m.weight            ?? null,
    height:            m.height            ?? null,
    headCircumference: m.headCircumference ?? null
  }))

  const activeTabConfig = TABS.find(t => t.key === activeTab)

  // ── Dernière mesure ────────────────────────────────────────────────────────
  const latest = measurements.length ? measurements[measurements.length - 1] : null

  if (loading) return <LoadingSpinner />

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-cyan-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 p-6">
      <div className="max-w-4xl mx-auto">

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-sky-500 to-teal-400 p-8 mb-8 shadow-xl shadow-sky-200 dark:shadow-sky-900/30">
          <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/4" />
          <div className="absolute bottom-0 left-0 w-28 h-28 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/4" />
          <div className="relative flex items-center justify-between gap-4 flex-wrap">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="text-4xl">📏</span>
                <div>
                  <h1 className="text-3xl font-bold text-white">Carnet de Croissance</h1>
                  <p className="text-sky-100 text-sm mt-0.5">Saisie médicale — données transmises au carnet parent</p>
                </div>
              </div>
              <p className="text-sky-100 text-sm mt-2">
                {measurements.length} mesure{measurements.length !== 1 ? 's' : ''} enregistrée{measurements.length !== 1 ? 's' : ''}
              </p>
            </div>
            <button
              onClick={openCreate}
              className="flex items-center gap-2 bg-white text-sky-600 font-semibold px-5 py-3 rounded-2xl shadow-lg hover:shadow-xl hover:scale-105 transition-all text-sm shrink-0"
            >
              <span className="text-lg font-bold">+</span> Nouvelle mesure
            </button>
          </div>
        </div>

        {/* ── Dernière mesure en un coup d'œil ───────────────────────────── */}
        {latest && (
          <div className="grid grid-cols-3 gap-4 mb-6">
            {[
              { key: 'weight',            label: 'Dernier poids',   unit: 'kg',  color: 'blue',   icon: '⚖️' },
              { key: 'height',            label: 'Dernière taille', unit: 'cm',  color: 'emerald', icon: '📐' },
              { key: 'headCircumference', label: 'Périmètre crânien', unit: 'cm', color: 'violet', icon: '🧠' }
            ].map(({ key, label, unit, color, icon }) => latest[key] ? (
              <motion.div
                key={key}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`bg-${color}-50 dark:bg-${color}-900/20 rounded-2xl p-4 text-center border border-${color}-100 dark:border-${color}-900/30`}
              >
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">{icon} {label}</p>
                <p className={`text-2xl font-bold text-${color}-700 dark:text-${color}-300`}>
                  {latest[key]}<span className="text-sm font-normal ml-1">{unit}</span>
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  {new Date(latest.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                </p>
              </motion.div>
            ) : null)}
          </div>
        )}

        {error && (
          <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl text-red-600 dark:text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* ── Formulaire ─────────────────────────────────────────────────── */}
        <AnimatePresence>
          {showForm && (
            <motion.div
              initial={{ opacity: 0, scale: 0.97, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: -10 }}
              transition={{ duration: 0.2 }}
              className="mb-6 bg-white dark:bg-slate-800 rounded-3xl shadow-xl border border-gray-100 dark:border-slate-700 overflow-hidden"
            >
              <div className="bg-gradient-to-r from-sky-500 to-teal-400 px-6 py-4 flex items-center justify-between">
                <h2 className="text-white font-semibold text-lg">
                  {editId ? '✏️ Modifier la mesure' : '📏 Nouvelle mesure'}
                </h2>
                <button onClick={() => setShowForm(false)} className="text-white/70 hover:text-white text-xl transition-colors">✕</button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  {/* Date */}
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                      Date de la mesure *
                    </label>
                    <input
                      type="date"
                      value={form.date}
                      max={new Date().toISOString().slice(0, 10)}
                      onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                      className="w-full px-4 py-3 rounded-2xl border-2 border-gray-100 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:border-sky-400 transition-colors"
                    />
                  </div>

                  {/* Poids */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                      ⚖️ Poids (kg)
                    </label>
                    <input
                      type="number" step="0.1" min="0.5" max="200"
                      value={form.weight}
                      onChange={e => setForm(f => ({ ...f, weight: e.target.value }))}
                      className="w-full px-4 py-3 rounded-2xl border-2 border-gray-100 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:border-sky-400 transition-colors"
                      placeholder="ex : 8.5"
                    />
                  </div>

                  {/* Taille */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                      📐 Taille (cm)
                    </label>
                    <input
                      type="number" step="0.1" min="20" max="250"
                      value={form.height}
                      onChange={e => setForm(f => ({ ...f, height: e.target.value }))}
                      className="w-full px-4 py-3 rounded-2xl border-2 border-gray-100 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:border-sky-400 transition-colors"
                      placeholder="ex : 72"
                    />
                  </div>

                  {/* Périmètre crânien */}
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                      🧠 Périmètre crânien (cm)
                    </label>
                    <input
                      type="number" step="0.1" min="20" max="80"
                      value={form.headCircumference}
                      onChange={e => setForm(f => ({ ...f, headCircumference: e.target.value }))}
                      className="w-full px-4 py-3 rounded-2xl border-2 border-gray-100 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:border-sky-400 transition-colors"
                      placeholder="ex : 43"
                    />
                  </div>
                </div>

                {formError && (
                  <p className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 px-4 py-2 rounded-xl">{formError}</p>
                )}

                <div className="flex gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 py-3 bg-gradient-to-r from-sky-500 to-teal-400 disabled:opacity-50 text-white font-semibold rounded-2xl hover:shadow-lg hover:scale-[1.02] transition-all"
                  >
                    {saving ? 'Enregistrement...' : editId ? 'Modifier' : 'Enregistrer la mesure'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="flex-1 py-3 bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 font-semibold rounded-2xl hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors"
                  >
                    Annuler
                  </button>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── État vide ───────────────────────────────────────────────────── */}
        {measurements.length === 0 && !showForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-20 bg-white dark:bg-slate-800 rounded-3xl border-2 border-dashed border-gray-200 dark:border-slate-700 mb-6"
          >
            <div className="text-6xl mb-4">📏</div>
            <p className="text-gray-500 dark:text-gray-400 font-medium mb-2">Aucune mesure enregistrée</p>
            <p className="text-gray-400 dark:text-gray-500 text-sm mb-6">
              Saisissez la première mesure pour démarrer le suivi de croissance
            </p>
            <button
              onClick={openCreate}
              className="px-6 py-3 bg-gradient-to-r from-sky-500 to-teal-400 text-white font-semibold rounded-2xl hover:shadow-lg transition-all text-sm"
            >
              + Saisir une mesure
            </button>
          </motion.div>
        )}

        {/* ── Graphique ───────────────────────────────────────────────────── */}
        {measurements.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 bg-white dark:bg-slate-800 rounded-3xl border border-gray-100 dark:border-slate-700 p-6 shadow-sm"
          >
            <h3 className="font-semibold text-gray-800 dark:text-gray-100 mb-4 flex items-center gap-2">
              <span>📊</span> Courbe de croissance
            </h3>
            <div className="flex gap-2 mb-5 flex-wrap">
              {TABS.map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                    activeTab === tab.key
                      ? 'text-white shadow-md'
                      : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-slate-600'
                  }`}
                  style={activeTab === tab.key ? { backgroundColor: tab.color } : {}}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            {chartData.filter(d => d[activeTab] !== null).length < 2 ? (
              <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-8">
                Ajoutez au moins 2 mesures pour afficher la courbe
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#9ca3af" />
                  <YAxis tick={{ fontSize: 11 }} stroke="#9ca3af" />
                  <Tooltip
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 24px rgba(0,0,0,0.1)' }}
                    formatter={(value) => [value, activeTabConfig.label]}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey={activeTab}
                    name={activeTabConfig.label}
                    stroke={activeTabConfig.color}
                    strokeWidth={2.5}
                    dot={{ fill: activeTabConfig.color, r: 4 }}
                    activeDot={{ r: 6 }}
                    connectNulls={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </motion.div>
        )}

        {/* ── Historique ──────────────────────────────────────────────────── */}
        {measurements.length > 0 && (
          <div>
            <h3 className="font-semibold text-gray-700 dark:text-gray-300 mb-3 text-sm uppercase tracking-wide px-1">
              Historique des mesures
            </h3>
            <div className="space-y-3">
              {[...measurements].reverse().map((m, i) => (
                <motion.div
                  key={m._id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="group bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 p-5 flex items-center gap-4 hover:shadow-lg hover:border-sky-200 dark:hover:border-sky-800 transition-all"
                >
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-sky-400 to-teal-400 flex items-center justify-center text-xl shadow-md shrink-0">
                    📏
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-800 dark:text-gray-100">
                      {new Date(m.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                      {m.weight && (
                        <span className="text-xs bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-2.5 py-0.5 rounded-full font-medium">
                          ⚖️ {m.weight} kg
                        </span>
                      )}
                      {m.height && (
                        <span className="text-xs bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 px-2.5 py-0.5 rounded-full font-medium">
                          📐 {m.height} cm
                        </span>
                      )}
                      {m.headCircumference && (
                        <span className="text-xs bg-violet-50 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 px-2.5 py-0.5 rounded-full font-medium">
                          🧠 {m.headCircumference} cm (PC)
                        </span>
                      )}
                    </div>
                  </div>
                  {/* Actions — modifier + supprimer */}
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <button
                      onClick={() => openEdit(m)}
                      className="p-2.5 bg-sky-50 dark:bg-sky-900/20 text-sky-600 dark:text-sky-400 rounded-xl hover:bg-sky-100 dark:hover:bg-sky-900/40 transition-colors text-sm"
                      title="Modifier"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => setDeleteTarget(m._id)}
                      className="p-2.5 bg-red-50 dark:bg-red-900/20 text-red-500 rounded-xl hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors text-sm"
                      title="Supprimer"
                    >
                      🗑️
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={!!deleteTarget}
        message="Supprimer cette mesure ? Cette action est irréversible."
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}
