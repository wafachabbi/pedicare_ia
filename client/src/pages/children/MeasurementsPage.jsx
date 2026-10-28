import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Area, AreaChart
} from 'recharts'
import { measurementsService } from '../../services/measurements.service'
import { aiService } from '../../services/ai.service'
import ConfirmModal from '../../components/ui/ConfirmModal'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import AIBadge from '../../components/ui/AIBadge'

const emptyForm = { date: '', weight: '', height: '', headCircumference: '' }

const METRICS = [
  {
    key: 'weight',
    label: 'Poids',
    unit: 'kg',
    color: '#3b82f6',
    gradient: ['#3b82f6', '#60a5fa'],
    bg: 'from-blue-500 to-blue-400',
    lightBg: 'bg-blue-50 dark:bg-blue-900/20',
    textColor: 'text-blue-600 dark:text-blue-400',
    icon: '⚖️',
  },
  {
    key: 'height',
    label: 'Taille',
    unit: 'cm',
    color: '#10b981',
    gradient: ['#10b981', '#34d399'],
    bg: 'from-emerald-500 to-emerald-400',
    lightBg: 'bg-emerald-50 dark:bg-emerald-900/20',
    textColor: 'text-emerald-600 dark:text-emerald-400',
    icon: '📐',
  },
  {
    key: 'headCircumference',
    label: 'Périmètre crânien',
    unit: 'cm',
    color: '#8b5cf6',
    gradient: ['#8b5cf6', '#a78bfa'],
    bg: 'from-violet-500 to-violet-400',
    lightBg: 'bg-violet-50 dark:bg-violet-900/20',
    textColor: 'text-violet-600 dark:text-violet-400',
    icon: '🧠',
  },
]

// Tooltip personnalisé pour le graphique
const CustomTooltip = ({ active, payload, label, unit }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-gray-100 dark:border-slate-700 px-4 py-3">
      <p className="text-xs text-gray-400 mb-1">{label}</p>
      <p className="font-bold text-gray-800 dark:text-gray-100 text-lg">
        {payload[0].value} <span className="text-sm font-normal text-gray-400">{unit}</span>
      </p>
    </div>
  )
}

export default function MeasurementsPage() {
  const { childId } = useParams()

  const [measurements, setMeasurements] = useState([])
  const [loading, setLoading]           = useState(true)
  const [error, setError]               = useState('')
  const [showForm, setShowForm]         = useState(false)
  const [form, setForm]                 = useState(emptyForm)
  const [editId, setEditId]             = useState(null)
  const [formError, setFormError]       = useState('')
  const [saving, setSaving]             = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [activeMetric, setActiveMetric] = useState('weight')
  const [aiAnalysis, setAiAnalysis]     = useState(null)
  const [aiLoading, setAiLoading]       = useState(false)
  const [aiError, setAiError]           = useState('')
  const [showAi, setShowAi]             = useState(false)

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

  const openCreate = () => {
    setForm({ ...emptyForm, date: new Date().toISOString().slice(0, 10) })
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
      setFormError('Au moins une mesure est requise')
      return
    }
    setSaving(true)
    try {
      const payload = {
        date: form.date,
        weight:            form.weight            ? parseFloat(form.weight)            : undefined,
        height:            form.height            ? parseFloat(form.height)            : undefined,
        headCircumference: form.headCircumference ? parseFloat(form.headCircumference) : undefined,
      }
      if (editId) {
        const res = await measurementsService.update(childId, editId, payload)
        setMeasurements(m => m.map(x => x._id === editId ? res.data.data : x))
      } else {
        const res = await measurementsService.create(childId, payload)
        setMeasurements(m => [...m, res.data.data].sort((a, b) => new Date(a.date) - new Date(b.date)))
      }
      setShowForm(false)
      setAiAnalysis(null)
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

  const handleAiAnalysis = async () => {
    setAiLoading(true)
    setAiError('')
    setShowAi(true)
    setAiAnalysis(null)
    try {
      const res = await aiService.analyzeGrowth(childId)
      setAiAnalysis(res.data.data)
    } catch (err) {
      setAiError(err.response?.data?.error?.message || "Erreur lors de l'analyse IA")
    } finally {
      setAiLoading(false)
    }
  }

  // Données graphique
  const sorted = [...measurements].sort((a, b) => new Date(a.date) - new Date(b.date))
  const chartData = sorted.map(m => ({
    date: new Date(m.date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' }),
    weight:            m.weight            ?? null,
    height:            m.height            ?? null,
    headCircumference: m.headCircumference ?? null,
  }))

  const latest  = sorted.length ? sorted[sorted.length - 1] : null
  const prev    = sorted.length > 1 ? sorted[sorted.length - 2] : null
  const metric  = METRICS.find(m => m.key === activeMetric)
  const hasChart = chartData.filter(d => d[activeMetric] !== null).length >= 2

  // Calcul progression dernière vs avant-dernière mesure
  const getDelta = (key) => {
    if (!latest || !prev || !latest[key] || !prev[key]) return null
    return (latest[key] - prev[key]).toFixed(1)
  }

  if (loading) return <LoadingSpinner />

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">

      {/* ══ HEADER ══════════════════════════════════════════════════════════ */}
      <div className="relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #1e40af 0%, #2563eb 50%, #3b82f6 100%)' }}>
        {/* Déco */}
        <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full bg-white/5" />
        <div className="absolute top-8 right-32 w-32 h-32 rounded-full bg-white/5" />
        <div className="absolute -bottom-8 left-1/3 w-48 h-48 rounded-full bg-white/5" />

        <div className="relative max-w-5xl mx-auto px-6 pt-10 pb-16">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <div className="w-12 h-12 rounded-2xl bg-white/15 flex items-center justify-center text-2xl">
                  📏
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-white">Carnet de Croissance</h1>
                  <p className="text-blue-200 text-sm">
                    {measurements.length} mesure{measurements.length !== 1 ? 's' : ''} enregistrée{measurements.length !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex gap-3 items-center flex-wrap">
              {measurements.length > 0 && (
                <button onClick={handleAiAnalysis}
                  className="flex items-center gap-2 bg-white/15 hover:bg-white/25 text-white font-semibold px-4 py-2.5 rounded-xl transition-all text-sm border border-white/20">
                  ✨ Analyse IA
                </button>
              )}
              <button onClick={openCreate}
                className="flex items-center gap-2 bg-white text-blue-700 font-bold px-5 py-2.5 rounded-xl shadow-lg hover:shadow-xl hover:scale-105 transition-all text-sm">
                <span className="text-lg font-bold">+</span> Ajouter
              </button>
            </div>
          </div>

          {/* ── Stats dernière mesure ─────────────────────────────────── */}
          {latest && (
            <div className="grid grid-cols-3 gap-3 mt-8">
              {METRICS.map(m => latest[m.key] ? (
                <motion.div key={m.key}
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/15 cursor-pointer hover:bg-white/20 transition-all"
                  onClick={() => setActiveMetric(m.key)}
                  style={{ outline: activeMetric === m.key ? '2px solid rgba(255,255,255,0.6)' : 'none' }}
                >
                  <p className="text-white/60 text-xs font-semibold uppercase tracking-wide mb-1">{m.icon} {m.label}</p>
                  <p className="text-white text-2xl font-bold">{latest[m.key]}<span className="text-white/60 text-sm font-normal ml-1">{m.unit}</span></p>
                  {getDelta(m.key) !== null && (
                    <p className={`text-xs mt-1 font-medium ${parseFloat(getDelta(m.key)) >= 0 ? 'text-green-300' : 'text-red-300'}`}>
                      {parseFloat(getDelta(m.key)) >= 0 ? '▲' : '▼'} {Math.abs(getDelta(m.key))} {m.unit} depuis la dernière
                    </p>
                  )}
                </motion.div>
              ) : (
                <div key={m.key} className="bg-white/5 rounded-2xl p-4 border border-white/10 opacity-40">
                  <p className="text-white/50 text-xs font-semibold uppercase tracking-wide mb-1">{m.icon} {m.label}</p>
                  <p className="text-white/30 text-sm">—</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ══ CONTENU ══════════════════════════════════════════════════════════ */}
      <div className="max-w-5xl mx-auto px-6 -mt-6 pb-12 space-y-5">

        {error && (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl text-red-600 dark:text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* ── Formulaire ─────────────────────────────────────────────────── */}
        <AnimatePresence>
          {showForm && (
            <motion.div
              initial={{ opacity: 0, y: -16, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -16, scale: 0.98 }}
              transition={{ duration: 0.2 }}
              className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl overflow-hidden border border-gray-100 dark:border-slate-700"
            >
              <div className="px-6 py-4 flex items-center justify-between"
                style={{ background: 'linear-gradient(135deg, #1e40af, #3b82f6)' }}>
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{editId ? '✏️' : '📏'}</span>
                  <div>
                    <h2 className="text-white font-bold text-lg">{editId ? 'Modifier la mesure' : 'Nouvelle mesure'}</h2>
                    <p className="text-blue-200 text-xs">Renseignez au moins une valeur</p>
                  </div>
                </div>
                <button onClick={() => setShowForm(false)}
                  className="w-8 h-8 rounded-full bg-white/15 hover:bg-white/25 text-white flex items-center justify-center transition-colors">
                  ✕
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Date */}
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-2">
                      📅 Date de la mesure *
                    </label>
                    <input type="date"
                      value={form.date}
                      max={new Date().toISOString().slice(0, 10)}
                      onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                      className="w-full px-4 py-3 rounded-2xl border-2 border-gray-100 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:border-blue-400 transition-colors text-sm"
                    />
                  </div>

                  {METRICS.map(m => (
                    <div key={m.key} className={m.key === 'headCircumference' ? 'sm:col-span-2' : ''}>
                      <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-2">
                        {m.icon} {m.label} ({m.unit})
                      </label>
                      <div className={`flex items-center gap-3 border-2 rounded-2xl px-4 py-3 transition-colors bg-gray-50 dark:bg-slate-700 focus-within:border-blue-400 ${form[m.key] ? 'border-blue-200' : 'border-gray-100 dark:border-slate-600'}`}>
                        <input type="number" step="0.1"
                          min={m.key === 'weight' ? '0.5' : '20'}
                          max={m.key === 'weight' ? '200' : m.key === 'height' ? '250' : '80'}
                          value={form[m.key]}
                          onChange={e => setForm(f => ({ ...f, [m.key]: e.target.value }))}
                          placeholder={m.key === 'weight' ? 'ex : 8.5' : m.key === 'height' ? 'ex : 72' : 'ex : 43'}
                          className="flex-1 text-sm text-gray-700 dark:text-gray-200 placeholder-gray-300 outline-none bg-transparent"
                        />
                        <span className="text-xs text-gray-400 font-medium">{m.unit}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {formError && (
                  <div className="mt-4 flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400 text-sm">
                    ⚠️ {formError}
                  </div>
                )}

                <div className="flex gap-3 mt-5">
                  <button type="submit" disabled={saving}
                    className="flex-1 py-3 font-bold text-white rounded-2xl transition-all hover:shadow-lg hover:scale-[1.02] disabled:opacity-50 text-sm"
                    style={{ background: 'linear-gradient(135deg, #1e40af, #3b82f6)' }}>
                    {saving ? 'Enregistrement...' : editId ? 'Modifier' : 'Enregistrer'}
                  </button>
                  <button type="button" onClick={() => setShowForm(false)}
                    className="flex-1 py-3 bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 font-semibold rounded-2xl hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors text-sm">
                    Annuler
                  </button>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Analyse IA ─────────────────────────────────────────────────── */}
        <AnimatePresence>
          {showAi && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-white dark:bg-slate-800 rounded-3xl shadow-xl border border-violet-100 dark:border-violet-900/30 overflow-hidden"
            >
              <div className="px-6 py-4 flex items-center justify-between"
                style={{ background: 'linear-gradient(135deg, #7c3aed, #6d28d9)' }}>
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🧠</span>
                  <div>
                    <h2 className="text-white font-bold text-lg">Analyse IA de la courbe</h2>
                    <AIBadge />
                  </div>
                </div>
                <button onClick={() => setShowAi(false)}
                  className="w-8 h-8 rounded-full bg-white/15 hover:bg-white/25 text-white flex items-center justify-center transition-colors">
                  ✕
                </button>
              </div>

              <div className="p-6">
                {aiLoading && (
                  <div className="flex items-center gap-3 py-4 text-violet-600 dark:text-violet-400">
                    <LoadingSpinner size="sm" />
                    <span className="text-sm font-medium animate-pulse">Analyse en cours par l'IA...</span>
                  </div>
                )}
                {aiError && (
                  <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400 text-sm">
                    ⚠️ {aiError}
                  </div>
                )}
                {aiAnalysis && !aiLoading && (
                  <div>
                    {/* Résumé mesures */}
                    <div className="grid grid-cols-3 gap-3 mb-5">
                      {METRICS.map(m => aiAnalysis.latestMeasurement?.[m.key] ? (
                        <div key={m.key} className={`${m.lightBg} rounded-2xl p-3 text-center`}>
                          <p className={`text-xs font-bold uppercase tracking-wide mb-1 ${m.textColor}`}>{m.icon} {m.label}</p>
                          <p className={`text-xl font-bold ${m.textColor}`}>
                            {aiAnalysis.latestMeasurement[m.key]}<span className="text-sm font-normal ml-1">{m.unit}</span>
                          </p>
                        </div>
                      ) : null)}
                    </div>
                    {/* Texte analyse */}
                    <div className="bg-violet-50 dark:bg-violet-900/10 rounded-2xl p-5 border border-violet-100 dark:border-violet-900/20">
                      {aiAnalysis.analysis.split('\n').map((line, i) => {
                        const html = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                        return line.trim()
                          ? <p key={i} className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed mb-2" dangerouslySetInnerHTML={{ __html: html }} />
                          : <br key={i} />
                      })}
                    </div>
                    <p className="text-xs text-gray-400 mt-3 text-right">
                      Modèle : {aiAnalysis.model} · {aiAnalysis.measurementCount} mesures analysées
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── État vide ───────────────────────────────────────────────────── */}
        {measurements.length === 0 && !showForm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="text-center py-24 bg-white dark:bg-slate-800 rounded-3xl border-2 border-dashed border-gray-200 dark:border-slate-700 shadow-sm">
            <div className="text-7xl mb-4">📏</div>
            <p className="text-gray-700 dark:text-gray-300 font-bold text-xl mb-2">Aucune mesure enregistrée</p>
            <p className="text-gray-400 text-sm mb-8 max-w-xs mx-auto">Commencez par ajouter la première mesure pour démarrer le suivi de croissance</p>
            <button onClick={openCreate}
              className="px-8 py-3.5 text-white font-bold rounded-2xl shadow-lg hover:shadow-xl hover:scale-105 transition-all text-sm"
              style={{ background: 'linear-gradient(135deg, #1e40af, #3b82f6)' }}>
              + Saisir une mesure
            </button>
          </motion.div>
        )}

        {/* ── Graphique ───────────────────────────────────────────────────── */}
        {measurements.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden"
          >
            {/* Onglets métriques */}
            <div className="flex border-b border-gray-100 dark:border-slate-700">
              {METRICS.map(m => (
                <button key={m.key} onClick={() => setActiveMetric(m.key)}
                  className={`flex-1 flex items-center justify-center gap-2 py-4 text-sm font-semibold transition-all ${
                    activeMetric === m.key
                      ? 'text-white border-b-2'
                      : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 border-b-2 border-transparent'
                  }`}
                  style={activeMetric === m.key ? {
                    borderBottomColor: m.color,
                    color: m.color,
                    background: `${m.color}10`
                  } : {}}
                >
                  <span>{m.icon}</span>
                  <span className="hidden sm:inline">{m.label}</span>
                  <span className="text-xs font-normal opacity-60">({m.unit})</span>
                </button>
              ))}
            </div>

            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                  <span>📊</span> Courbe de croissance
                </h3>
                {latest?.[activeMetric] && (
                  <div className={`${metric.lightBg} px-3 py-1.5 rounded-xl`}>
                    <span className={`text-sm font-bold ${metric.textColor}`}>
                      {latest[activeMetric]} {metric.unit}
                    </span>
                    <span className="text-xs text-gray-400 ml-1">(dernière)</span>
                  </div>
                )}
              </div>

              {!hasChart ? (
                <div className="flex flex-col items-center justify-center py-12 text-gray-300 dark:text-gray-600">
                  <span className="text-5xl mb-3">📈</span>
                  <p className="text-sm">Ajoutez au moins 2 mesures pour afficher la courbe</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={chartData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                    <defs>
                      <linearGradient id={`grad-${activeMetric}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor={metric.color} stopOpacity={0.15} />
                        <stop offset="95%" stopColor={metric.color} stopOpacity={0}    />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip unit={metric.unit} />} />
                    <Area
                      type="monotone"
                      dataKey={activeMetric}
                      stroke={metric.color}
                      strokeWidth={3}
                      fill={`url(#grad-${activeMetric})`}
                      dot={{ fill: metric.color, r: 5, strokeWidth: 2, stroke: '#fff' }}
                      activeDot={{ r: 7, strokeWidth: 2, stroke: '#fff' }}
                      connectNulls={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </motion.div>
        )}

        {/* ── Historique en timeline ───────────────────────────────────────── */}
        {measurements.length > 0 && (
          <div>
            <h3 className="font-bold text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2">
              <span className="w-1 h-5 rounded-full bg-blue-500 inline-block" />
              Historique des mesures
            </h3>
            <div className="relative">
              {/* Ligne verticale de la timeline */}
              <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-100 dark:bg-slate-700" />

              <div className="space-y-3">
                {[...measurements].reverse().map((m, i) => (
                  <motion.div
                    key={m._id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="group relative flex gap-4 items-start"
                  >
                    {/* Point timeline */}
                    <div className="relative z-10 w-12 h-12 rounded-2xl shrink-0 flex items-center justify-center text-xl shadow-md"
                      style={{ background: 'linear-gradient(135deg, #1e40af, #3b82f6)' }}>
                      📏
                    </div>

                    {/* Contenu */}
                    <div className="flex-1 bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 p-4 hover:shadow-md hover:border-blue-200 dark:hover:border-blue-800 transition-all">
                      <div className="flex items-center justify-between gap-3 flex-wrap">
                        <p className="font-semibold text-gray-800 dark:text-gray-100 text-sm">
                          {new Date(m.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                        </p>
                        {/* Actions hover */}
                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => openEdit(m)}
                            className="p-2 bg-blue-50 dark:bg-blue-900/20 text-blue-500 rounded-xl hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors text-sm"
                            title="Modifier">
                            ✏️
                          </button>
                          <button onClick={() => setDeleteTarget(m._id)}
                            className="p-2 bg-red-50 dark:bg-red-900/20 text-red-400 rounded-xl hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors text-sm"
                            title="Supprimer">
                            🗑️
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        {m.weight && (
                          <div className="flex items-center gap-1.5 bg-blue-50 dark:bg-blue-900/20 px-3 py-1.5 rounded-xl">
                            <span className="text-xs">⚖️</span>
                            <span className="text-sm font-bold text-blue-600 dark:text-blue-400">{m.weight}</span>
                            <span className="text-xs text-gray-400">kg</span>
                          </div>
                        )}
                        {m.height && (
                          <div className="flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-900/20 px-3 py-1.5 rounded-xl">
                            <span className="text-xs">📐</span>
                            <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{m.height}</span>
                            <span className="text-xs text-gray-400">cm</span>
                          </div>
                        )}
                        {m.headCircumference && (
                          <div className="flex items-center gap-1.5 bg-violet-50 dark:bg-violet-900/20 px-3 py-1.5 rounded-xl">
                            <span className="text-xs">🧠</span>
                            <span className="text-sm font-bold text-violet-600 dark:text-violet-400">{m.headCircumference}</span>
                            <span className="text-xs text-gray-400">cm (PC)</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
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
