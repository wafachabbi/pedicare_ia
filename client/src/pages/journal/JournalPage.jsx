import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { journalService } from '../../services/journal.service'
import { aiService } from '../../services/ai.service'
import ConfirmModal from '../../components/ui/ConfirmModal'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import { useAuth } from '../../hooks/useAuth'
import AIBadge from '../../components/ui/AIBadge'
import AIText from '../../components/ui/AIText'

const CATEGORIES = {
  Observation: '👀',
  Question: '❓',
  'Symptôme': '🤒',
  Comportement: '🧸',
  Alimentation: '🍼',
  Sommeil: '😴',
  Autre: '📝'
}

// Date du jour au format YYYY-MM-DD en heure locale
const today = () => {
  const d = new Date()
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
  return d.toISOString().slice(0, 10)
}
const emptyForm = () => ({ date: today(), category: 'Observation', text: '' })

const inputClass = 'w-full px-4 py-3 rounded-2xl border-2 border-gray-100 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:border-amber-400 transition-colors'
const labelClass = 'block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2'

export default function JournalPage() {
  const { childId } = useParams()
  const { user } = useAuth()
  const readOnly = user?.role !== 'parent' // le pédiatre consulte le journal sans le modifier
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [editId, setEditId] = useState(null)
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [aiResult, setAiResult] = useState(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState('')

  const load = async () => {
    try {
      setLoading(true)
      const res = await journalService.getAll(childId)
      setEntries(res.data.data)
    } catch {
      setError('Erreur lors du chargement')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load(); setAiResult(null) }, [childId])

  const openCreate = () => { setForm(emptyForm()); setEditId(null); setFormError(''); setShowForm(true) }
  const openEdit = (e) => {
    setForm({ date: e.date.slice(0, 10), category: e.category, text: e.text })
    setEditId(e._id); setFormError(''); setShowForm(true)
  }

  const sortByDate = list => [...list].sort((a, b) => new Date(b.date) - new Date(a.date))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.text.trim()) { setFormError('Le texte est requis'); return }
    setSaving(true)
    try {
      if (editId) {
        const res = await journalService.update(childId, editId, form)
        setEntries(list => sortByDate(list.map(x => x._id === editId ? res.data.data : x)))
      } else {
        const res = await journalService.create(childId, form)
        setEntries(list => sortByDate([res.data.data, ...list]))
      }
      setShowForm(false)
    } catch (err) {
      setFormError(err.response?.data?.error?.message || 'Erreur')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    try {
      await journalService.delete(childId, deleteTarget)
      setEntries(list => list.filter(x => x._id !== deleteTarget))
    } catch {
      setError('Erreur lors de la suppression')
    } finally {
      setDeleteTarget(null)
    }
  }

  const handleSummarize = async () => {
    setAiLoading(true); setAiError('')
    try {
      const res = await aiService.summarizeJournal(childId)
      setAiResult(res.data.data)
    } catch (err) {
      setAiError(err.response?.data?.error?.message || 'Erreur lors de la génération de la synthèse')
    } finally {
      setAiLoading(false)
    }
  }

  if (loading) return <LoadingSpinner />

  const visible = filter ? entries.filter(e => e.category === filter) : entries

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-orange-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 p-6">
      <div className="max-w-3xl mx-auto">

        {/* Header */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-amber-500 to-orange-400 p-8 mb-8 shadow-xl shadow-amber-200 dark:shadow-amber-900/30">
          <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2" />
          <div className="relative flex items-center justify-between gap-4 flex-wrap">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="text-4xl">📔</span>
                <h1 className="text-3xl font-bold text-white">Journal des observations</h1>
              </div>
              <p className="text-amber-100 text-sm">{entries.length} observation{entries.length !== 1 ? 's' : ''}</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleSummarize}
                disabled={aiLoading || entries.length === 0}
                className="flex items-center gap-2 bg-white/20 text-white font-semibold px-4 py-3 rounded-2xl hover:bg-white/30 disabled:opacity-50 transition-all text-sm"
              >
                ✨ {aiLoading ? 'Synthèse...' : 'Synthèse IA'}
              </button>
              {!readOnly && (
                <button
                  onClick={openCreate}
                  className="flex items-center gap-2 bg-white text-amber-600 font-semibold px-5 py-3 rounded-2xl shadow-lg hover:shadow-xl hover:scale-105 transition-all text-sm"
                >
                  <span className="text-lg">+</span> Ajouter
                </button>
              )}
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl text-red-600 dark:text-red-400 text-sm">{error}</div>
        )}
        {aiError && (
          <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl text-red-600 dark:text-red-400 text-sm">{aiError}</div>
        )}

        {/* Synthèse IA */}
        <AnimatePresence>
          {aiResult && (
            <motion.div
              initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
              className="mb-6 bg-white dark:bg-slate-800 rounded-3xl shadow-xl border border-violet-100 dark:border-violet-900/40 p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-gray-800 dark:text-gray-100">Synthèse pour la consultation</h2>
                <div className="flex items-center gap-2">
                  <AIBadge />
                  <button onClick={() => setAiResult(null)} aria-label="Fermer" className="text-gray-400 hover:text-gray-600 text-sm">✕</button>
                </div>
              </div>
              <AIText text={aiResult.summary} />
              <p className="text-xs text-gray-400 mt-4">
                Modèle : {aiResult.model} · {aiResult.entryCount} observations analysées (3 derniers mois) · Ne remplace pas un avis médical
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Formulaire */}
        <AnimatePresence>
          {showForm && (
            <motion.div
              initial={{ opacity: 0, scale: 0.97, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: -10 }}
              transition={{ duration: 0.2 }}
              className="mb-6 bg-white dark:bg-slate-800 rounded-3xl shadow-xl border border-gray-100 dark:border-slate-700 overflow-hidden"
            >
              <div className="bg-gradient-to-r from-amber-500 to-orange-400 px-6 py-4">
                <h2 className="text-white font-semibold text-lg">
                  {editId ? '✏️ Modifier l\'observation' : '✨ Nouvelle observation'}
                </h2>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className={labelClass}>Date *</label>
                    <input type="date" value={form.date} max={today()}
                      onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Catégorie *</label>
                    <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className={inputClass}>
                      {Object.entries(CATEGORIES).map(([c, icon]) => <option key={c} value={c}>{icon} {c}</option>)}
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <label className={labelClass}>Observation *</label>
                    <textarea value={form.text} onChange={e => setForm(f => ({ ...f, text: e.target.value }))}
                      rows={4} maxLength={2000} className={`${inputClass} resize-none`}
                      placeholder="ex: Fièvre à 38,5°C depuis ce matin, mange moins que d'habitude..." />
                    <p className="text-xs text-gray-400 text-right mt-1">{form.text.length}/2000</p>
                  </div>
                </div>
                {formError && <p className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 px-4 py-2 rounded-xl">{formError}</p>}
                <div className="flex gap-3 pt-2">
                  <button type="submit" disabled={saving}
                    className="flex-1 py-3 bg-gradient-to-r from-amber-500 to-orange-400 disabled:opacity-50 text-white font-semibold rounded-2xl hover:shadow-lg hover:scale-[1.02] transition-all">
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

        {/* Filtres */}
        {entries.length > 0 && (
          <div className="flex gap-2 flex-wrap mb-4">
            {['', ...Object.keys(CATEGORIES)].map(c => (
              <button key={c || 'all'} onClick={() => setFilter(c)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${filter === c
                  ? 'bg-amber-500 text-white'
                  : 'bg-white dark:bg-slate-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-slate-700 hover:border-amber-300'}`}>
                {c ? `${CATEGORIES[c]} ${c}` : 'Toutes'}
              </button>
            ))}
          </div>
        )}

        {/* Liste vide */}
        {entries.length === 0 && !showForm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="text-center py-20 bg-white dark:bg-slate-800 rounded-3xl border-2 border-dashed border-gray-200 dark:border-slate-700">
            <div className="text-6xl mb-4">📔</div>
            <p className="text-gray-500 dark:text-gray-400 font-medium mb-2">Aucune observation</p>
            {readOnly ? (
              <p className="text-gray-400 dark:text-gray-500 text-sm">Les parents n'ont encore rien noté dans le journal</p>
            ) : (
              <>
                <p className="text-gray-400 dark:text-gray-500 text-sm mb-6">Notez le sommeil, l'alimentation, les symptômes ou les questions pour le pédiatre</p>
                <button onClick={openCreate}
                  className="px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-400 text-white font-semibold rounded-2xl hover:shadow-lg transition-all text-sm">
                  + Ajouter une observation
                </button>
              </>
            )}
          </motion.div>
        )}
        {entries.length > 0 && visible.length === 0 && (
          <p className="text-center text-sm text-gray-400 py-10">Aucune observation dans cette catégorie</p>
        )}

        {/* Liste */}
        <div className="space-y-3">
          {visible.map((e, i) => (
            <motion.div
              key={e._id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              className="group bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 p-5 flex items-start gap-4 hover:shadow-lg hover:border-amber-200 dark:hover:border-amber-800 transition-all"
            >
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-400 flex items-center justify-center text-xl shadow-md shrink-0">
                {CATEGORIES[e.category] || '📝'}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="text-xs bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 px-2.5 py-0.5 rounded-full font-medium">{e.category}</span>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    📅 {new Date(e.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </span>
                </div>
                <p className="text-gray-800 dark:text-gray-100 text-sm whitespace-pre-line break-words">{e.text}</p>
              </div>

              {!readOnly && (
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity shrink-0">
                  <button onClick={() => openEdit(e)} aria-label="Modifier"
                    className="p-2.5 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 rounded-xl hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors text-sm font-medium">
                    ✏️
                  </button>
                  <button onClick={() => setDeleteTarget(e._id)} aria-label="Supprimer"
                    className="p-2.5 bg-red-50 dark:bg-red-900/20 text-red-500 rounded-xl hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors text-sm">
                    🗑️
                  </button>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </div>

      <ConfirmModal
        isOpen={!!deleteTarget}
        title="Supprimer l'observation"
        message="Supprimer cette observation du journal ?"
        confirmLabel="Supprimer"
        danger
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}
