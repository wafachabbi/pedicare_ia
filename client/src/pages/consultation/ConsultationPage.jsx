import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useChild } from '../../hooks/useChild'
import { questionsService } from '../../services/questions.service'
import { appointmentsService } from '../../services/appointments.service'
import { consultationSheetService } from '../../services/consultationSheet.service'
import ConfirmModal from '../../components/ui/ConfirmModal'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import ErrorMessage from '../../components/ui/ErrorMessage'
import GlassCard from '../../components/ui/GlassCard'
import AIBadge from '../../components/ui/AIBadge'
import ConsultationSheetView from '../../components/consultation/ConsultationSheetView'

const MAX_LENGTH = 500

const emptyForm = { question: '', category: 'autre', priority: 'normale', appointmentId: '' }

const CATEGORY_CONFIG = {
  symptome: { label: 'Symptôme', icon: '🤒' },
  alimentation: { label: 'Alimentation', icon: '🍼' },
  sommeil: { label: 'Sommeil', icon: '😴' },
  developpement: { label: 'Développement', icon: '🧸' },
  traitement: { label: 'Traitement', icon: '💊' },
  autre: { label: 'Autre', icon: '💬' }
}

const PRIORITY_CONFIG = {
  haute: { label: 'Haute', rank: 0, badge: 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400' },
  normale: { label: 'Normale', rank: 1, badge: 'bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400' },
  basse: { label: 'Basse', rank: 2, badge: 'bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-gray-400' }
}

const TABS = [
  { value: 'en_attente', label: 'En attente' },
  { value: 'traitee', label: 'Traitées' },
  { value: '', label: 'Toutes' }
]

const inputClass = 'w-full px-4 py-3 rounded-2xl border-2 border-gray-100 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:border-mint-500 transition-colors'
const labelClass = 'block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2'

// Même tri que l'API : priorité (haute > normale > basse) puis createdAt desc
const sortQuestions = (list) => [...list].sort((a, b) =>
  PRIORITY_CONFIG[a.priority].rank - PRIORITY_CONFIG[b.priority].rank || new Date(b.createdAt) - new Date(a.createdAt)
)

const formatAppointment = (a) => {
  if (!a.dateTime) return 'RDV passé'
  const d = new Date(a.dateTime)
  return `${d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })} · ${d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`
}

export default function ConsultationPage() {
  const { activeChild, loading: childLoading } = useChild()
  const childId = activeChild?._id
  const [questions, setQuestions] = useState([])
  const [appointments, setAppointments] = useState([])
  const [filter, setFilter] = useState('en_attente')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [form, setForm] = useState(emptyForm)
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)
  const [editId, setEditId] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)

  const loadQuestions = async () => {
    try {
      setLoading(true)
      setError('')
      const res = await questionsService.getAll(childId, filter ? { status: filter } : {})
      setQuestions(res.data.data)
    } catch {
      setError('Erreur lors du chargement des questions')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { if (childId) loadQuestions() }, [childId, filter])

  // RDV à venir pour le select "Lier à un rendez-vous"
  useEffect(() => {
    if (!childId) return
    appointmentsService.getAll(childId)
      .then(res => setAppointments(res.data.data.filter(a => a.status === 'upcoming')))
      .catch(() => setAppointments([]))
  }, [childId])

  // Applique un changement local en respectant l'onglet actif
  const applyLocal = (list) => setQuestions(sortQuestions(filter ? list.filter(q => q.status === filter) : list))

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!form.question.trim()) { setFormError('Question requise'); return }
    setSaving(true)
    try {
      const res = await questionsService.create(childId, { ...form, appointmentId: form.appointmentId || null })
      applyLocal([...questions, res.data.data])
      setForm(emptyForm)
      setFormError('')
    } catch (err) {
      setFormError(err.response?.data?.error?.message || 'Erreur')
    } finally {
      setSaving(false)
    }
  }

  const handleUpdate = async (id, data) => {
    const res = await questionsService.update(childId, id, data)
    applyLocal(questions.map(q => q._id === id ? res.data.data : q))
  }

  const toggleStatus = async (q) => {
    try {
      await handleUpdate(q._id, { status: q.status === 'traitee' ? 'en_attente' : 'traitee' })
    } catch {
      setError('Erreur lors de la mise à jour')
    }
  }

  const handleDelete = async () => {
    try {
      await questionsService.delete(childId, deleteTarget)
      setQuestions(list => list.filter(q => q._id !== deleteTarget))
    } catch {
      setError('Erreur lors de la suppression')
    } finally {
      setDeleteTarget(null)
    }
  }

  if (childLoading) return <LoadingSpinner />

  if (!activeChild) {
    return (
      <div className="text-center py-16 text-gray-400 dark:text-gray-500">
        <p className="text-4xl mb-3">👶</p>
        <p>Aucun profil enfant. Commencez par en créer un.</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-mint-50 via-white to-sky-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 p-6">
      <div className="max-w-3xl mx-auto">

        {/* Header */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-sky-500 to-violet-500 p-8 mb-8 shadow-xl shadow-mint-100 dark:shadow-mint-900/30">
          <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2" />
          <div className="relative">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-4xl">🩺</span>
              <h1 className="text-3xl font-bold text-white">Préparer ma consultation</h1>
            </div>
            <p className="text-mint-50 text-sm">Pour {activeChild.firstName}</p>
          </div>
        </div>

        {/* Section questions */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-2 h-2 bg-mint-500 rounded-full" />
            <h2 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">Mes questions pour le pédiatre</h2>
          </div>

          {/* Formulaire rapide */}
          <form onSubmit={handleCreate}
            className="mb-6 bg-white dark:bg-slate-800 rounded-3xl shadow-xl border border-gray-100 dark:border-slate-700 p-6 space-y-4">
            <QuestionFields form={form} setForm={setForm} appointments={appointments} />
            {formError && <p className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 px-4 py-2 rounded-xl">{formError}</p>}
            <button type="submit" disabled={saving}
              className="w-full py-3 bg-gradient-to-r from-sky-500 to-violet-500 disabled:opacity-50 text-white font-semibold rounded-2xl hover:shadow-lg hover:scale-[1.02] transition-all">
              {saving ? 'Ajout...' : '+ Ajouter'}
            </button>
          </form>

          {/* Onglets */}
          <div className="flex gap-2 mb-4 bg-white dark:bg-slate-800 p-1.5 rounded-2xl border border-gray-100 dark:border-slate-700">
            {TABS.map(tab => (
              <button key={tab.value} onClick={() => setFilter(tab.value)}
                className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${
                  filter === tab.value
                    ? 'bg-mint-500 text-white shadow-md'
                    : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-700'
                }`}>
                {tab.label}
              </button>
            ))}
          </div>

          {error && <div className="mb-4"><ErrorMessage message={error} onRetry={loadQuestions} /></div>}

          {loading ? (
            <div className="flex justify-center py-10"><LoadingSpinner /></div>
          ) : questions.length === 0 ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="text-center py-16 bg-white dark:bg-slate-800 rounded-3xl border-2 border-dashed border-gray-200 dark:border-slate-700">
              <div className="text-5xl mb-4">💭</div>
              <p className="text-gray-500 dark:text-gray-400 font-medium px-6">
                Aucune question pour le moment — notez ce que vous voulez demander au pédiatre
              </p>
            </motion.div>
          ) : (
            <div className="space-y-3">
              <AnimatePresence>
                {questions.map((q, i) => (
                  <QuestionCard
                    key={q._id}
                    q={q}
                    index={i}
                    appointments={appointments}
                    editing={editId === q._id}
                    onEdit={() => setEditId(q._id)}
                    onCancelEdit={() => setEditId(null)}
                    onSave={async (data) => { await handleUpdate(q._id, data); setEditId(null) }}
                    onToggle={() => toggleStatus(q)}
                    onDelete={() => setDeleteTarget(q._id)}
                  />
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* Fiche consultation 1 clic */}
        <ConsultationSheetSection childId={childId} childName={activeChild.firstName} />
      </div>

      <ConfirmModal
        isOpen={!!deleteTarget}
        title="Supprimer la question"
        message="Supprimer cette question ?"
        confirmLabel="Supprimer"
        danger
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}

// Champs partagés entre le formulaire d'ajout et l'édition inline
function QuestionFields({ form, setForm, appointments }) {
  return (
    <>
      <div>
        <label className={labelClass}>Question *</label>
        <textarea value={form.question} maxLength={MAX_LENGTH} rows={3}
          onChange={e => setForm(f => ({ ...f, question: e.target.value }))}
          className={`${inputClass} resize-none`}
          placeholder="Ex : Est-ce normal qu'il se réveille plusieurs fois par nuit ?" />
        <p className={`text-xs text-right mt-1 ${form.question.length >= MAX_LENGTH ? 'text-red-500' : 'text-gray-400'}`}>
          {form.question.length}/{MAX_LENGTH}
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className={labelClass}>Catégorie</label>
          <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className={inputClass}>
            {Object.entries(CATEGORY_CONFIG).map(([value, cfg]) => (
              <option key={value} value={value}>{cfg.icon} {cfg.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>Priorité</label>
          <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))} className={inputClass}>
            {Object.entries(PRIORITY_CONFIG).map(([value, cfg]) => (
              <option key={value} value={value}>{cfg.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>Lier à un rendez-vous</label>
          <select value={form.appointmentId} onChange={e => setForm(f => ({ ...f, appointmentId: e.target.value }))} className={inputClass}>
            <option value="">— Aucun —</option>
            {appointments.map(a => (
              <option key={a._id} value={a._id}>{formatAppointment(a)}</option>
            ))}
          </select>
        </div>
      </div>
    </>
  )
}

function QuestionCard({ q, index, appointments, editing, onEdit, onCancelEdit, onSave, onToggle, onDelete }) {
  const [form, setForm] = useState(emptyForm)
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)
  const category = CATEGORY_CONFIG[q.category] || CATEGORY_CONFIG.autre
  const priority = PRIORITY_CONFIG[q.priority] || PRIORITY_CONFIG.normale
  const linked = appointments.find(a => a._id === q.appointmentId)
  const done = q.status === 'traitee'

  useEffect(() => {
    if (editing) {
      setForm({ question: q.question, category: q.category, priority: q.priority, appointmentId: q.appointmentId || '' })
      setFormError('')
    }
  }, [editing])

  const handleSave = async (e) => {
    e.preventDefault()
    if (!form.question.trim()) { setFormError('Question requise'); return }
    setSaving(true)
    try {
      await onSave({ ...form, appointmentId: form.appointmentId || null })
    } catch (err) {
      setFormError(err.response?.data?.error?.message || 'Erreur')
    } finally {
      setSaving(false)
    }
  }

  // RDV lié passé (absent de la liste des RDV à venir) : on garde l'option pour ne pas le perdre en édition
  const editAppointments = q.appointmentId && !linked
    ? [...appointments, { _id: q.appointmentId, dateTime: null }]
    : appointments

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ delay: index * 0.03 }}
      className={`bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 p-5 hover:shadow-lg hover:border-mint-100 dark:hover:border-mint-900 transition-all ${done && !editing ? 'opacity-70' : ''}`}
    >
      {editing ? (
        <form onSubmit={handleSave} className="space-y-4">
          <QuestionFields form={form} setForm={setForm} appointments={editAppointments} />
          {formError && <p className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 px-4 py-2 rounded-xl">{formError}</p>}
          <div className="flex gap-3">
            <button type="submit" disabled={saving}
              className="flex-1 py-2.5 bg-gradient-to-r from-sky-500 to-violet-500 disabled:opacity-50 text-white font-semibold rounded-2xl hover:shadow-lg transition-all text-sm">
              {saving ? 'Enregistrement...' : 'Enregistrer'}
            </button>
            <button type="button" onClick={onCancelEdit}
              className="flex-1 py-2.5 bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 font-semibold rounded-2xl hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors text-sm">
              Annuler
            </button>
          </div>
        </form>
      ) : (
        <div className="flex items-start gap-4">
          {/* Case Traitée */}
          <label className="flex flex-col items-center gap-1 shrink-0 cursor-pointer pt-0.5" title="Marquer comme traitée">
            <input type="checkbox" checked={done} onChange={onToggle}
              className="w-5 h-5 rounded accent-mint-500 cursor-pointer" />
            <span className="text-[10px] text-gray-400 dark:text-gray-500">Traitée</span>
          </label>

          <div className="flex-1 min-w-0">
            <p className={`text-gray-800 dark:text-gray-100 whitespace-pre-wrap break-words ${done ? 'line-through' : ''}`}>{q.question}</p>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-mint-50 dark:bg-mint-900/20 text-mint-600 dark:text-mint-400">
                {category.icon} {category.label}
              </span>
              <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${priority.badge}`}>
                {priority.label}
              </span>
              {linked && (
                <span className="text-xs text-gray-500 dark:text-gray-400">📅 {formatAppointment(linked)}</span>
              )}
              {q.appointmentId && !linked && (
                <span className="text-xs text-gray-400 dark:text-gray-500">📅 RDV passé</span>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 shrink-0">
            <button onClick={onEdit} title="Modifier"
              className="p-2.5 bg-mint-50 dark:bg-mint-900/20 text-mint-600 dark:text-mint-400 rounded-xl hover:bg-mint-100 dark:hover:bg-mint-900/40 transition-colors">
              ✏️
            </button>
            <button onClick={onDelete} title="Supprimer"
              className="p-2.5 bg-red-50 dark:bg-red-900/20 text-red-500 rounded-xl hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors">
              🗑️
            </button>
          </div>
        </div>
      )}
    </motion.div>
  )
}

// Génération + historique des fiches consultation (indépendant de la section questions)
function ConsultationSheetSection({ childId, childName }) {
  const [sheets, setSheets] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [generating, setGenerating] = useState(false)
  const [genError, setGenError] = useState('')
  const [deleteTarget, setDeleteTarget] = useState(null)

  const loadSheets = async () => {
    try {
      setLoading(true)
      setError('')
      const res = await consultationSheetService.getByChild(childId)
      setSheets(res.data.data)
      setSelectedId(null)
    } catch {
      setError("Erreur lors du chargement de l'historique")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { if (childId) loadSheets() }, [childId])

  const handleGenerate = async () => {
    setGenerating(true)
    setGenError('')
    try {
      const res = await consultationSheetService.generate(childId)
      const sheet = res.data.data
      // Une fiche renvoyée depuis le cache existe déjà dans l'historique : on la remonte sans doublon
      setSheets(list => [sheet, ...list.filter(s => s._id !== sheet._id)])
      setSelectedId(sheet._id)
    } catch (err) {
      setGenError(err.response?.status === 502
        ? "La génération de la fiche par l'IA a échoué. Vérifiez votre connexion puis réessayez."
        : err.response?.data?.error?.message || 'Erreur lors de la génération de la fiche')
    } finally {
      setGenerating(false)
    }
  }

  const handleDelete = async () => {
    try {
      await consultationSheetService.delete(deleteTarget)
      setSheets(list => list.filter(s => s._id !== deleteTarget))
      if (selectedId === deleteTarget) setSelectedId(null)
    } catch {
      setError('Erreur lors de la suppression')
    } finally {
      setDeleteTarget(null)
    }
  }

  const selected = sheets.find(s => s._id === selectedId)

  return (
    <div className="space-y-4">
      <GlassCard className="p-6">
        <div className="flex items-center gap-3 mb-2 flex-wrap">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">📋 Fiche consultation 1 clic</h2>
          <AIBadge />
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Synthèse de vos questions en attente, des vaccinations et des dernières mesures, partagée avec le pédiatre du prochain rendez-vous.
        </p>
        <button onClick={handleGenerate} disabled={generating}
          className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-sky-500 to-violet-500 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold rounded-2xl hover:shadow-lg transition-all text-sm inline-flex items-center justify-center gap-2">
          {generating ? <><LoadingSpinner size="sm" /> Génération en cours…</> : '✨ Générer la fiche consultation'}
        </button>
        {genError && <div className="mt-4"><ErrorMessage message={genError} onRetry={handleGenerate} /></div>}
      </GlassCard>

      <AnimatePresence mode="wait">
        {selected && (
          <motion.div key={selected._id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <ConsultationSheetView sheet={selected} childName={childName} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Historique */}
      <div>
        <div className="flex items-center gap-3 mb-3">
          <div className="w-2 h-2 bg-violet-400 rounded-full" />
          <h2 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">Fiches précédentes</h2>
          <span className="bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 text-xs font-semibold px-2.5 py-0.5 rounded-full">{sheets.length}</span>
        </div>
        {error && <div className="mb-3"><ErrorMessage message={error} onRetry={loadSheets} /></div>}
        {loading ? (
          <div className="flex justify-center py-6"><LoadingSpinner /></div>
        ) : sheets.length === 0 ? (
          <p className="text-sm text-gray-400 dark:text-gray-500">Aucune fiche générée pour le moment</p>
        ) : (
          <ul className="space-y-2">
            {sheets.map(s => (
              <li key={s._id}
                className={`flex items-center gap-3 px-4 py-3 rounded-2xl border transition-all ${
                  s._id === selectedId
                    ? 'bg-sky-50 dark:bg-sky-900/20 border-sky-200 dark:border-sky-800'
                    : 'bg-white dark:bg-slate-800 border-gray-100 dark:border-slate-700 hover:border-sky-200 dark:hover:border-sky-800'
                }`}>
                <button onClick={() => setSelectedId(id => id === s._id ? null : s._id)} className="flex-1 min-w-0 text-left">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
                    📋 {new Date(s.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                    <span className="text-gray-400 font-normal"> · {new Date(s.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{s.content?.resume}</p>
                </button>
                <button onClick={() => setDeleteTarget(s._id)} title="Supprimer la fiche"
                  className="p-2 bg-red-50 dark:bg-red-900/20 text-red-500 rounded-xl hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors shrink-0">
                  🗑️
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <ConfirmModal
        isOpen={!!deleteTarget}
        title="Supprimer la fiche"
        message="Supprimer cette fiche consultation ? Le pédiatre n'y aura plus accès."
        confirmLabel="Supprimer"
        danger
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}
