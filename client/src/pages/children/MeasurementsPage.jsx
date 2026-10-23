import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts'
import { measurementsService } from '../../services/measurements.service'
import { aiService } from '../../services/ai.service'
import ConfirmModal from '../../components/ui/ConfirmModal'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import AIBadge from '../../components/ui/AIBadge'

const emptyForm = { date: '', weight: '', height: '', headCircumference: '' }

// Onglets du graphique
const TABS = [
  { key: 'weight', label: 'Poids (kg)', color: '#3b82f6' },
  { key: 'height', label: 'Taille (cm)', color: '#10b981' },
  { key: 'headCircumference', label: 'Périmètre crânien (cm)', color: '#8b5cf6' }
]

export default function MeasurementsPage() {
  const { childId } = useParams()

  // ── État CRUD ──────────────────────────────────────────────────────────────
  const [measurements, setMeasurements] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [editId, setEditId] = useState(null)
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)

  // ── État graphique ─────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState('weight')

  // ── État IA ────────────────────────────────────────────────────────────────
  const [aiAnalysis, setAiAnalysis] = useState(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState('')
  const [showAi, setShowAi] = useState(false)

  // ── Chargement ─────────────────────────────────────────────────────────────
  const load = async () => {
    try {
      setLoading(true)
      const res = await measurementsService.getAll(childId)
      setMeasurements(res.data.data)
    } catch {
      setError('Erreur lors du chargement des mesures')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [childId])

  // ── Formulaire ─────────────────────────────────────────────────────────────
  const openCreate = () => {
    setForm(emptyForm)
    setEditId(null)
    setFormError('')
    setShowForm(true)
  }

  const openEdit = (m) => {
    setForm({
      date: m.date.slice(0, 10),
      weight: m.weight ?? '',
      height: m.height ?? '',
      headCircumference: m.headCircumference ?? ''
    })
    setEditId(m._id)
    setFormError('')
    setShowForm(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.date) { setFormError('La date est requise'); return }
    if (!form.weight && !form.height && !form.headCircumference) {
      setFormError('Au moins une mesure (poids, taille ou périmètre crânien) est requise')
      return
    }
    setSaving(true)
    try {
      const payload = {
        date: form.date,
        weight: form.weight ? parseFloat(form.weight) : undefined,
        height: form.height ? parseFloat(form.height) : undefined,
        headCircumference: form.headCircumference ? parseFloat(form.headCircumference) : undefined
      }
      if (editId) {
        const res = await measurementsService.update(childId, editId, payload)
        setMeasurements(m => m.map(x => x._id === editId ? res.data.data : x))
      } else {
        const res = await measurementsService.create(childId, payload)
        setMeasurements(m => [...m, res.data.data].sort((a, b) => new Date(a.date) - new Date(b.date)))
      }
      setShowForm(false)
      setAiAnalysis(null) // invalide le cache IA local après une modification
    } catch (err) {
      setFormError(err.response?.data?.error?.message || 'Erreur lors de la sauvegarde')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    try {
      await measurementsService.delete(childId, deleteTarget)
      setMeasurements(m => m.filter(x => x._id !== deleteTarget))
      setAiAnalysis(null)
    } catch {
      setError('Erreur lors de la suppression')
    } finally {
      setDeleteTarget(null)
    }
  }

  // ── Analyse IA ─────────────────────────────────────────────────────────────
  const handleAiAnalysis = async () => {
    setAiLoading(true)
    setAiError('')
    setShowAi(true)
    try {
      const res = await aiService.analyzeGrowth(childId)
      setAiAnalysis(res.data.data)
    } catch (err) {
      setAiError(err.response?.data?.error?.message || 'Erreur lors de l\'analyse IA')
    } finally {
      setAiLoading(false)
    }
  }

  // ── Données graphique ──────────────────────────────────────────────────────
  const chartData = measurements.map(m => ({
    date: new Date(m.date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' }),
    weight: m.weight ?? null,
    height: m.height ?? null,
    headCircumference: m.headCircumference ?? null
  }))

  const activeTabConfig = TABS.find(t => t.key === activeTab)

  if (loading) return <LoadingSpinner />

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 p-6">
      <div className="max-w-4xl mx-auto">

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-500 to-cyan-400 p-8 mb-8 shadow-xl shadow-blue-200 dark:shadow-blue-900/30">
          <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2" />
          <div className="relative flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="text-4xl">📏</span>
                <h1 className="text-3xl font-bold text-white">Carnet de Croissance</h1>
              </div>
              <p className="text-blue-100 text-sm">{measurements.length} mesure{measurements.length !== 1 ? 's' : ''} enregistrée{measurements.length !== 1 ? 's' : ''}</p>
            </div>
            <div className="flex gap-3">
              {measurements.length > 0 && (
                <button
                  onClick={handleAiAnalysis}
                  className="flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white font-semibold px-4 py-3 rounded-2xl transition-all text-sm border border-white/30"
                >
                  ✨ Analyser
                </button>
              )}
              <button
                onClick={openCreate}
                className="flex items-center gap-2 bg-white text-blue-600 font-semibold px-5 py-3 rounded-2xl shadow-lg hover:shadow-xl hover:scale-105 transition-all text-sm"
              >
                <span className="text-lg">+</span> Ajouter
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl text-red-600 dark:text-red-400 text-sm">{error}</div>
        )}

        {/* ── Formulaire inline ───────────────────────────────────────────── */}
        <AnimatePresence>
          {showForm && (
            <motion.div
              initial={{ opacity: 0, scale: 0.97, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: -10 }}
              transition={{ duration: 0.2 }}
              className="mb-6 bg-white dark:bg-slate-800 rounded-3xl shadow-xl border border-gray-100 dark:border-slate-700 overflow-hidden"
            >
              <div className="bg-gradient-to-r from-blue-500 to-cyan-400 px-6 py-4">
                <h2 className="text-white font-semibold text-lg">
                  {editId ? '✏️ Modifier la mesure' : '✨ Nouvelle mesure'}
                </h2>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  {/* Date */}
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Date de la mesure *</label>
                    <input
                      type="date"
                      value={form.date}
                      onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                      className="w-full px-4 py-3 rounded-2xl border-2 border-gray-100 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:border-blue-400 transition-colors"
                    />
                  </div>
                  {/* Poids */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Poids (kg)</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0.5"
                      max="200"
                      value={form.weight}
                      onChange={e => setForm(f => ({ ...f, weight: e.target.value }))}
                      className="w-full px-4 py-3 rounded-2xl border-2 border-gray-100 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:border-blue-400 transition-colors"
                      placeholder="ex: 8.5"
                    />
                  </div>
                  {/* Taille */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Taille (cm)</label>
                    <input
                      type="number"
                      step="0.1"
                      min="20"
                      max="250"
                      value={form.height}
                      onChange={e => setForm(f => ({ ...f, height: e.target.value }))}
                      className="w-full px-4 py-3 rounded-2xl border-2 border-gray-100 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:border-blue-400 transition-colors"
                      placeholder="ex: 72"
                    />
                  </div>
                  {/* Périmètre crânien */}
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Périmètre crânien (cm)</label>
                    <input
                      type="number"
                      step="0.1"
                      min="20"
                      max="80"
                      value={form.headCircumference}
                      onChange={e => setForm(f => ({ ...f, headCircumference: e.target.value }))}
                      className="w-full px-4 py-3 rounded-2xl border-2 border-gray-100 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:border-blue-400 transition-colors"
                      placeholder="ex: 43"
                    />
                  </div>
                </div>
                {formError && (
                  <p className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 px-4 py-2 rounded-xl">{formError}</p>
                )}
                <div className="flex gap-3 pt-2">
                  <button type="submit" disabled={saving}
                    className="flex-1 py-3 bg-gradient-to-r from-blue-500 to-cyan-400 disabled:opacity-50 text-white font-semibold rounded-2xl hover:shadow-lg hover:scale-[1.02] transition-all">
                    {saving ? 'Enregistrement...' : 'Enregistrer'}
                  </button>
                  <button type="button" onClick={() => setShowForm(false)}
                    className="flex-1 py-3 bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 font-semibold rounded-2xl hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors">
                    Annuler
                  </button>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Analyse IA ──────────────────────────────────────────────────── */}
        <AnimatePresence>
          {showAi && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-6 bg-white dark:bg-slate-800 rounded-3xl shadow-xl border border-violet-100 dark:border-violet-900/30 overflow-hidden"
            >
              <div className="bg-gradient-to-r from-violet-500 to-indigo-500 px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🧠</span>
                  <h2 className="text-white font-semibold text-lg">Analyse IA de la courbe</h2>
                  <AIBadge />
                </div>
                <button onClick={() => setShowAi(false)} className="text-white/70 hover:text-white text-xl transition-colors">✕</button>
              </div>
              <div className="p-6">
                {aiLoading && (
                  <div className="flex items-center gap-3 text-violet-600 dark:text-violet-400">
                    <LoadingSpinner size="sm" />
                    <span className="text-sm font-medium">Analyse en cours...</span>
                  </div>
                )}
                {aiError && (
                  <p className="text-red-500 text-sm bg-red-50 dark:bg-red-900/20 px-4 py-3 rounded-xl">{aiError}</p>
                )}
                {aiAnalysis && !aiLoading && (
                  <div>
                    {/* Dernière mesure résumée */}
                    <div className="grid grid-cols-3 gap-3 mb-5">
                      {aiAnalysis.latestMeasurement?.weight && (
                        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-2xl p-3 text-center">
                          <p className="text-xs text-blue-500 font-semibold uppercase tracking-wide mb-1">Poids</p>
                          <p className="text-xl font-bold text-blue-700 dark:text-blue-300">{aiAnalysis.latestMeasurement.weight}<span className="text-sm font-normal ml-1">kg</span></p>
                        </div>
                      )}
                      {aiAnalysis.latestMeasurement?.height && (
                        <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl p-3 text-center">
                          <p className="text-xs text-emerald-500 font-semibold uppercase tracking-wide mb-1">Taille</p>
                          <p className="text-xl font-bold text-emerald-700 dark:text-emerald-300">{aiAnalysis.latestMeasurement.height}<span className="text-sm font-normal ml-1">cm</span></p>
                        </div>
                      )}
                      {aiAnalysis.latestMeasurement?.headCircumference && (
                        <div className="bg-violet-50 dark:bg-violet-900/20 rounded-2xl p-3 text-center">
                          <p className="text-xs text-violet-500 font-semibold uppercase tracking-wide mb-1">PC</p>
                          <p className="text-xl font-bold text-violet-700 dark:text-violet-300">{aiAnalysis.latestMeasurement.headCircumference}<span className="text-sm font-normal ml-1">cm</span></p>
                        </div>
                      )}
                    </div>
                    {/* Texte analyse */}
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      {aiAnalysis.analysis.split('\n').map((line, i) => {
                        const bold = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                        return line.trim()
                          ? <p key={i} className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed mb-2" dangerouslySetInnerHTML={{ __html: bold }} />
                          : <br key={i} />
                      })}
                    </div>
                    <p className="text-xs text-gray-400 mt-4">Modèle : {aiAnalysis.model} · {aiAnalysis.measurementCount} mesures analysées</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── État vide ───────────────────────────────────────────────────── */}
        {measurements.length === 0 && !showForm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="text-center py-20 bg-white dark:bg-slate-800 rounded-3xl border-2 border-dashed border-gray-200 dark:border-slate-700">
            <div className="text-6xl mb-4">📏</div>
            <p className="text-gray-500 dark:text-gray-400 font-medium mb-2">Aucune mesure enregistrée</p>
            <p className="text-gray-400 dark:text-gray-500 text-sm mb-6">Commencez par ajouter une mesure pour suivre la croissance</p>
            <button onClick={openCreate}
              className="px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-400 text-white font-semibold rounded-2xl hover:shadow-lg transition-all text-sm">
              + Ajouter une mesure
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
            {/* Onglets */}
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
              <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-8">Ajoutez au moins 2 mesures pour afficher la courbe</p>
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

        {/* ── Liste des mesures ───────────────────────────────────────────── */}
        {measurements.length > 0 && (
          <div>
            <h3 className="font-semibold text-gray-700 dark:text-gray-300 mb-3 text-sm uppercase tracking-wide px-1">Historique</h3>
            <div className="space-y-3">
              {[...measurements].reverse().map((m, i) => (
                <motion.div
                  key={m._id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="group bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 p-5 flex items-center gap-4 hover:shadow-lg hover:border-blue-200 dark:hover:border-blue-800 transition-all"
                >
                  {/* Icône */}
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-400 to-cyan-400 flex items-center justify-center text-xl shadow-md shrink-0">
                    📏
                  </div>
                  {/* Infos */}
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
                  {/* Actions */}
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <button onClick={() => openEdit(m)}
                      className="p-2.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-xl hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors text-sm">
                      ✏️
                    </button>
                    <button onClick={() => setDeleteTarget(m._id)}
                      className="p-2.5 bg-red-50 dark:bg-red-900/20 text-red-500 rounded-xl hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors text-sm">
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
        message="Supprimer cette mesure ?"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}
