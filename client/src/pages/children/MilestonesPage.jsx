import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { milestonesService } from '../../services/milestones.service'
import { aiService } from '../../services/ai.service'
import ConfirmModal from '../../components/ui/ConfirmModal'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import AIBadge from '../../components/ui/AIBadge'

const CATEGORIES = {
  'Motricité globale': '🏃',
  'Motricité fine': '✋',
  Langage: '🗣️',
  'Social/Émotionnel': '🤗',
  Cognitif: '🧠'
}

const STATUSES = {
  atteint: { label: 'Atteint', badge: 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400' },
  en_cours: { label: 'En cours', badge: 'bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400' },
  non_atteint: { label: 'Non atteint', badge: 'bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-gray-400' }
}

const emptyForm = { category: 'Motricité globale', title: '', expectedAgeMonths: '', status: 'en_cours', achievedAt: '', notes: '' }

const inputClass = 'w-full px-4 py-3 rounded-2xl border-2 border-gray-100 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:border-violet-400 transition-colors'
const labelClass = 'block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2'

export default function MilestonesPage() {
  const { childId } = useParams()
  const [milestones, setMilestones] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
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
      const res = await milestonesService.getAll(childId)
      setMilestones(res.data.data)
    } catch {
      setError('Erreur lors du chargement')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load(); setAiResult(null) }, [childId])

  const openCreate = () => { setForm(emptyForm); setEditId(null); setFormError(''); setShowForm(true) }
  const openEdit = (m) => {
    setForm({
      category: m.category, title: m.title,
      expectedAgeMonths: m.expectedAgeMonths ?? '',
      status: m.status, achievedAt: m.achievedAt ? m.achievedAt.slice(0, 10) : '', notes: m.notes || ''
    })
    setEditId(m._id); setFormError(''); setShowForm(true)
  }

  const toPayload = (f) => ({
    ...f,
    expectedAgeMonths: f.expectedAgeMonths === '' ? null : Number(f.expectedAgeMonths),
    achievedAt: f.status === 'atteint' && f.achievedAt ? f.achievedAt : null
  })

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.title.trim()) { setFormError('Titre requis'); return }
    setSaving(true)
    try {
      if (editId) {
        const res = await milestonesService.update(childId, editId, toPayload(form))
        setMilestones(list => list.map(x => x._id === editId ? res.data.data : x))
      } else {
        const res = await milestonesService.create(childId, toPayload(form))
        setMilestones(list => [...list, res.data.data])
      }
      setShowForm(false)
    } catch (err) {
      setFormError(err.response?.data?.error?.message || 'Erreur')
    } finally {
      setSaving(false)
    }
  }

  // Changement rapide de statut depuis la liste
  const setStatus = async (m, status) => {
    try {
      const res = await milestonesService.update(childId, m._id, { status })
      setMilestones(list => list.map(x => x._id === m._id ? res.data.data : x))
    } catch {
      setError('Erreur lors de la mise à jour')
    }
  }

  const handleDelete = async () => {
    try {
      await milestonesService.delete(childId, deleteTarget)
      setMilestones(list => list.filter(x => x._id !== deleteTarget))
    } catch {
      setError('Erreur lors de la suppression')
    } finally {
      setDeleteTarget(null)
    }
  }

  const handleAnalyze = async () => {
    setAiLoading(true); setAiError('')
    try {
      const res = await aiService.analyzeMilestones(childId)
      setAiResult(res.data.data)
    } catch (err) {
      setAiError(err.response?.data?.error?.message || 'Erreur lors de l\'analyse IA')
    } finally {
      setAiLoading(false)
    }
  }

  const addSuggestion = async (s) => {
    try {
      const res = await milestonesService.create(childId, {
        category: s.category, title: s.title, expectedAgeMonths: s.expectedAgeMonths, status: 'en_cours', notes: s.tip
      })
      setMilestones(list => [...list, res.data.data])
      setAiResult(r => ({ ...r, suggestions: r.suggestions.filter(x => x !== s) }))
    } catch (err) {
      setAiError(err.response?.data?.error?.message || 'Erreur lors de l\'ajout')
    }
  }

  if (loading) return <LoadingSpinner />

  const achieved = milestones.filter(m => m.status === 'atteint').length
  const progress = milestones.length ? Math.round((achieved / milestones.length) * 100) : 0

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-fuchsia-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 p-6">
      <div className="max-w-3xl mx-auto">

        {/* Header */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-violet-500 to-fuchsia-400 p-8 mb-8 shadow-xl shadow-violet-200 dark:shadow-violet-900/30">
          <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2" />
          <div className="relative flex items-center justify-between gap-4 flex-wrap">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="text-4xl">🌱</span>
                <h1 className="text-3xl font-bold text-white">Étapes de développement</h1>
              </div>
              <p className="text-violet-100 text-sm">{achieved}/{milestones.length} étape{milestones.length !== 1 ? 's' : ''} atteinte{achieved !== 1 ? 's' : ''}</p>
              {milestones.length > 0 && (
                <div className="mt-3 h-2 w-56 bg-white/20 rounded-full overflow-hidden">
                  <div className="h-full bg-white rounded-full transition-all" style={{ width: `${progress}%` }} />
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleAnalyze}
                disabled={aiLoading}
                className="flex items-center gap-2 bg-white/20 text-white font-semibold px-4 py-3 rounded-2xl hover:bg-white/30 disabled:opacity-50 transition-all text-sm"
              >
                ✨ {aiLoading ? 'Analyse...' : 'Jalons OMS'}
              </button>
              <button
                onClick={openCreate}
                className="flex items-center gap-2 bg-white text-violet-600 font-semibold px-5 py-3 rounded-2xl shadow-lg hover:shadow-xl hover:scale-105 transition-all text-sm"
              >
                <span className="text-lg">+</span> Ajouter
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl text-red-600 dark:text-red-400 text-sm">{error}</div>
        )}
        {aiError && (
          <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl text-red-600 dark:text-red-400 text-sm">{aiError}</div>
        )}

        {/* Analyse IA jalons OMS */}
        <AnimatePresence>
          {aiResult && (
            <motion.div
              initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
              className="mb-6 bg-white dark:bg-slate-800 rounded-3xl shadow-xl border border-violet-100 dark:border-violet-900/40 p-6"
            >
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold text-gray-800 dark:text-gray-100">Jalons OMS — {aiResult.ageMonths} mois</h2>
                <div className="flex items-center gap-2">
                  <AIBadge />
                  <button onClick={() => setAiResult(null)} aria-label="Fermer" className="text-gray-400 hover:text-gray-600 text-sm">✕</button>
                </div>
              </div>
              <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed mb-4">{aiResult.assessment}</p>

              {aiResult.suggestions.length > 0 && (
                <>
                  <p className={labelClass}>Étapes suggérées</p>
                  <div className="space-y-2">
                    {aiResult.suggestions.map((s, i) => (
                      <div key={i} className="flex items-start gap-3 p-3 rounded-2xl bg-violet-50 dark:bg-violet-900/20">
                        <span className="text-xl">{CATEGORIES[s.category]}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-800 dark:text-gray-100">
                            {s.title}
                            {s.expectedAgeMonths != null && <span className="text-xs text-gray-500 ml-2">vers {s.expectedAgeMonths} mois</span>}
                          </p>
                          {s.tip && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">💡 {s.tip}</p>}
                        </div>
                        <button onClick={() => addSuggestion(s)}
                          className="shrink-0 px-3 py-1.5 text-xs font-semibold rounded-xl bg-violet-500 text-white hover:bg-violet-400 transition-colors">
                          + Suivre
                        </button>
                      </div>
                    ))}
                  </div>
                </>
              )}
              <p className="text-xs text-gray-400 mt-4">Modèle : {aiResult.model} · Chaque enfant évolue à son rythme — ne remplace pas un avis médical</p>
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
              <div className="bg-gradient-to-r from-violet-500 to-fuchsia-400 px-6 py-4">
                <h2 className="text-white font-semibold text-lg">
                  {editId ? '✏️ Modifier l\'étape' : '✨ Nouvelle étape'}
                </h2>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="sm:col-span-2">
                    <label className={labelClass}>Étape *</label>
                    <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                      className={inputClass} placeholder="ex: Tient assis sans aide, Dit ses premiers mots..." maxLength={100} />
                  </div>
                  <div>
                    <label className={labelClass}>Catégorie *</label>
                    <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className={inputClass}>
                      {Object.entries(CATEGORIES).map(([c, icon]) => <option key={c} value={c}>{icon} {c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Âge attendu (mois)</label>
                    <input type="number" min={0} max={216} value={form.expectedAgeMonths}
                      onChange={e => setForm(f => ({ ...f, expectedAgeMonths: e.target.value }))}
                      className={inputClass} placeholder="ex: 12" />
                  </div>
                  <div>
                    <label className={labelClass}>Statut</label>
                    <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} className={inputClass}>
                      {Object.entries(STATUSES).map(([s, { label }]) => <option key={s} value={s}>{label}</option>)}
                    </select>
                  </div>
                  {form.status === 'atteint' && (
                    <div>
                      <label className={labelClass}>Date atteinte</label>
                      <input type="date" value={form.achievedAt}
                        onChange={e => setForm(f => ({ ...f, achievedAt: e.target.value }))} className={inputClass} />
                    </div>
                  )}
                  <div className="sm:col-span-2">
                    <label className={labelClass}>Notes</label>
                    <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                      rows={3} maxLength={500} className={`${inputClass} resize-none`} placeholder="Optionnel" />
                  </div>
                </div>
                {formError && <p className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 px-4 py-2 rounded-xl">{formError}</p>}
                <div className="flex gap-3 pt-2">
                  <button type="submit" disabled={saving}
                    className="flex-1 py-3 bg-gradient-to-r from-violet-500 to-fuchsia-400 disabled:opacity-50 text-white font-semibold rounded-2xl hover:shadow-lg hover:scale-[1.02] transition-all">
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

        {/* Liste vide */}
        {milestones.length === 0 && !showForm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="text-center py-20 bg-white dark:bg-slate-800 rounded-3xl border-2 border-dashed border-gray-200 dark:border-slate-700">
            <div className="text-6xl mb-4">🌱</div>
            <p className="text-gray-500 dark:text-gray-400 font-medium mb-2">Aucune étape suivie</p>
            <p className="text-gray-400 dark:text-gray-500 text-sm mb-6">Ajoutez une étape ou laissez l'IA suggérer les jalons OMS adaptés à l'âge</p>
            <button onClick={openCreate}
              className="px-6 py-3 bg-gradient-to-r from-violet-500 to-fuchsia-400 text-white font-semibold rounded-2xl hover:shadow-lg transition-all text-sm">
              + Ajouter une étape
            </button>
          </motion.div>
        )}

        {/* Liste groupée par catégorie */}
        <div className="space-y-6">
          {Object.entries(CATEGORIES).map(([category, icon]) => {
            const items = milestones.filter(m => m.category === category)
            if (items.length === 0) return null
            return (
              <div key={category}>
                <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-600 dark:text-gray-300 mb-2">
                  <span>{icon}</span> {category}
                  <span className="text-xs font-normal text-gray-400">({items.filter(m => m.status === 'atteint').length}/{items.length})</span>
                </h2>
                <div className="space-y-2">
                  {items.map((m, i) => (
                    <motion.div
                      key={m._id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.04 }}
                      className="group bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 p-4 flex items-center gap-4 hover:shadow-lg hover:border-violet-200 dark:hover:border-violet-800 transition-all"
                    >
                      <button
                        onClick={() => setStatus(m, m.status === 'atteint' ? 'en_cours' : 'atteint')}
                        aria-label={m.status === 'atteint' ? 'Marquer comme en cours' : 'Marquer comme atteint'}
                        className={`w-8 h-8 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${m.status === 'atteint'
                          ? 'bg-emerald-500 border-emerald-500 text-white'
                          : 'border-gray-300 dark:border-slate-600 hover:border-emerald-400'}`}
                      >
                        {m.status === 'atteint' && '✓'}
                      </button>

                      <div className="flex-1 min-w-0">
                        <p className={`font-medium truncate ${m.status === 'atteint' ? 'text-gray-500 dark:text-gray-400' : 'text-gray-800 dark:text-gray-100'}`}>{m.title}</p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap text-xs text-gray-500 dark:text-gray-400">
                          <span className={`px-2.5 py-0.5 rounded-full font-medium ${STATUSES[m.status].badge}`}>{STATUSES[m.status].label}</span>
                          {m.expectedAgeMonths != null && <span>Attendu vers {m.expectedAgeMonths} mois</span>}
                          {m.achievedAt && <span>· Atteint le {new Date(m.achievedAt).toLocaleDateString('fr-FR')}</span>}
                        </div>
                        {m.notes && <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{m.notes}</p>}
                      </div>

                      <div className="flex gap-2 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity shrink-0">
                        <button onClick={() => openEdit(m)} aria-label="Modifier"
                          className="p-2.5 bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400 rounded-xl hover:bg-violet-100 dark:hover:bg-violet-900/40 transition-colors text-sm font-medium">
                          ✏️
                        </button>
                        <button onClick={() => setDeleteTarget(m._id)} aria-label="Supprimer"
                          className="p-2.5 bg-red-50 dark:bg-red-900/20 text-red-500 rounded-xl hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors text-sm">
                          🗑️
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <ConfirmModal
        isOpen={!!deleteTarget}
        title="Supprimer l'étape"
        message="Supprimer cette étape de développement ?"
        confirmLabel="Supprimer"
        danger
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}
