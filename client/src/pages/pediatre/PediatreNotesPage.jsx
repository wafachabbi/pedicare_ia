import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { notesService } from '../../services/notes.service'
import GlassCard from '../../components/ui/GlassCard'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import ErrorMessage from '../../components/ui/ErrorMessage'
import ConfirmModal from '../../components/ui/ConfirmModal'

const CATEGORY_CONFIG = {
  observation: { label: 'Observation', icon: '👁️', badge: 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300' },
  diagnostic:  { label: 'Diagnostic',  icon: '🩺', badge: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300' },
  traitement:  { label: 'Traitement',  icon: '💊', badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' },
  suivi:       { label: 'Suivi',       icon: '📈', badge: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300' }
}

const MAX_CONTENT = 2000
const EMPTY_FORM = { childId: '', title: '', category: 'observation', content: '', isPrivate: true }

const inputClass = 'w-full px-4 py-2.5 rounded-xl border-2 border-gray-100 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-700 dark:text-gray-100 text-sm focus:outline-none focus:border-sky-400 transition-colors disabled:opacity-60'

export default function PediatreNotesPage() {
  const [patients, setPatients] = useState([])
  const [patientsLoading, setPatientsLoading] = useState(true)
  const [notes, setNotes] = useState([])
  const [filterChildId, setFilterChildId] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)

  const [toDelete, setToDelete] = useState(null)

  const loadNotes = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await notesService.getAll(filterChildId)
      setNotes(res.data.data)
    } catch {
      setError('Erreur lors du chargement des notes')
    } finally {
      setLoading(false)
    }
  }, [filterChildId])

  useEffect(() => {
    notesService.getPatients()
      .then(res => setPatients(res.data.data))
      .catch(() => setError('Erreur lors du chargement des patients'))
      .finally(() => setPatientsLoading(false))
  }, [])

  useEffect(() => { loadNotes() }, [loadNotes])

  const openCreate = () => {
    setEditingId(null)
    setForm({ ...EMPTY_FORM, childId: filterChildId })
    setFormError('')
    setShowForm(true)
  }

  const openEdit = (note) => {
    setEditingId(note._id)
    setForm({
      childId: note.childId?._id || '',
      title: note.title,
      category: note.category,
      content: note.content,
      isPrivate: note.isPrivate
    })
    setFormError('')
    setShowForm(true)
  }

  const closeForm = () => {
    setShowForm(false)
    setEditingId(null)
    setForm(EMPTY_FORM)
    setFormError('')
  }

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setForm(f => ({ ...f, [name]: type === 'checkbox' ? checked : value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.childId || !form.title.trim() || !form.content.trim()) {
      setFormError('Patient, titre et contenu requis')
      return
    }
    setSaving(true)
    setFormError('')
    try {
      if (editingId) {
        const { title, content, category, isPrivate } = form
        await notesService.update(editingId, { title, content, category, isPrivate })
      } else {
        await notesService.create(form)
      }
      closeForm()
      loadNotes()
    } catch (err) {
      setFormError(err.response?.data?.error?.message || "Erreur lors de l'enregistrement")
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    try {
      await notesService.delete(toDelete._id)
      setNotes(n => n.filter(note => note._id !== toDelete._id))
    } catch {
      setError('Erreur lors de la suppression')
    } finally {
      setToDelete(null)
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 p-4">

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-sky-500 to-violet-500 p-7 shadow-xl">
        <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/4" />
        <div className="absolute bottom-0 left-0 w-28 h-28 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2" />
        <div className="relative flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-2xl shrink-0">
            📝
          </div>
          <div>
            <p className="text-sky-100 text-sm font-medium">Espace Professionnel de Santé</p>
            <h1 className="text-2xl font-bold text-white">Mes notes</h1>
            <p className="text-white/70 text-sm mt-0.5">
              {notes.length} note{notes.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
      </motion.div>

      {/* Toolbar */}
      {patients.length === 0 && !patientsLoading ? (
        <div className="p-4 bg-sky-50 dark:bg-sky-900/20 border border-sky-200 dark:border-sky-800 rounded-2xl text-sky-700 dark:text-sky-300 text-sm">
          Vous n'avez pas encore de patient (aucun rendez-vous)
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <label htmlFor="filter-patient" className="sr-only">Patient</label>
            <select id="filter-patient" value={filterChildId} onChange={e => setFilterChildId(e.target.value)} className={inputClass}>
              <option value="">Tous les patients</option>
              {patients.map(p => (
                <option key={p._id} value={p._id}>{p.firstName}</option>
              ))}
            </select>
          </div>
          <button onClick={openCreate}
            className="px-5 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white text-sm font-semibold shadow transition-colors">
            + Nouvelle note
          </button>
        </div>
      )}

      {/* Form */}
      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            <GlassCard className="p-6">
              <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">
                {editingId ? 'Modifier la note' : 'Nouvelle note'}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="childId" className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Patient</label>
                    <select id="childId" name="childId" value={form.childId} onChange={handleChange}
                      disabled={!!editingId} className={inputClass}>
                      <option value="">Sélectionner un patient</option>
                      {patients.map(p => (
                        <option key={p._id} value={p._id}>{p.firstName}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="category" className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Catégorie</label>
                    <select id="category" name="category" value={form.category} onChange={handleChange} className={inputClass}>
                      {Object.entries(CATEGORY_CONFIG).map(([value, cfg]) => (
                        <option key={value} value={value}>{cfg.icon} {cfg.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label htmlFor="title" className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Titre</label>
                  <input id="title" name="title" value={form.title} onChange={handleChange}
                    maxLength={100} placeholder="Ex : Contrôle des 9 mois" className={inputClass} />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label htmlFor="content" className="block text-xs font-semibold text-gray-500 dark:text-gray-400">Contenu</label>
                    <span className={`text-xs ${form.content.length >= MAX_CONTENT ? 'text-red-500' : 'text-gray-400'}`}>
                      {form.content.length}/{MAX_CONTENT}
                    </span>
                  </div>
                  <textarea id="content" name="content" value={form.content} onChange={handleChange}
                    maxLength={MAX_CONTENT} rows={5} placeholder="Observations, diagnostic, traitement..."
                    className={`${inputClass} resize-y`} />
                </div>

                <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 cursor-pointer">
                  <input type="checkbox" name="isPrivate" checked={form.isPrivate} onChange={handleChange}
                    className="w-4 h-4 rounded accent-sky-500" />
                  🔒 Note privée
                </label>

                <ErrorMessage message={formError} />

                <div className="flex gap-3 justify-end">
                  <button type="button" onClick={closeForm}
                    className="px-4 py-2 text-sm rounded-xl border border-gray-200 dark:border-slate-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition">
                    Annuler
                  </button>
                  <button type="submit" disabled={saving}
                    className="px-5 py-2 text-sm font-semibold rounded-xl bg-sky-500 hover:bg-sky-400 text-white transition disabled:opacity-60">
                    {saving ? 'Enregistrement...' : editingId ? 'Enregistrer' : 'Créer la note'}
                  </button>
                </div>
              </form>
            </GlassCard>
          </motion.div>
        )}
      </AnimatePresence>

      <ErrorMessage message={error} onRetry={loadNotes} />

      {/* Notes list */}
      {loading ? (
        <div className="flex justify-center py-16"><LoadingSpinner size="lg" color="sky" /></div>
      ) : notes.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-3xl border-2 border-dashed border-gray-200 dark:border-slate-700">
          <div className="text-5xl mb-3">📝</div>
          <p className="text-gray-400 text-sm">Aucune note pour le moment</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notes.map((note, i) => {
            const cfg = CATEGORY_CONFIG[note.category] || CATEGORY_CONFIG.observation
            return (
              <motion.div
                key={note._id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 p-5 hover:shadow-md hover:border-sky-200 dark:hover:border-sky-800 transition-all"
              >
                <div className="flex items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${cfg.badge}`}>
                        {cfg.icon} {cfg.label}
                      </span>
                      {note.isPrivate && <span title="Note privée" aria-label="Note privée">🔒</span>}
                    </div>
                    <p className="font-semibold text-gray-800 dark:text-gray-100">{note.title}</p>
                    <p className="text-sm text-gray-500 mt-0.5">
                      👶 {note.childId?.firstName || 'Enfant supprimé'}
                      {' · '}
                      📅 {new Date(note.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                    <p className="text-sm text-gray-400 dark:text-gray-400 mt-2 line-clamp-2 whitespace-pre-line">{note.content}</p>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2 shrink-0">
                    <button onClick={() => openEdit(note)}
                      className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-sky-50 dark:bg-sky-900/30 text-sky-600 dark:text-sky-300 hover:bg-sky-100 dark:hover:bg-sky-900/50 transition">
                      Modifier
                    </button>
                    <button onClick={() => setToDelete(note)}
                      className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 transition">
                      Supprimer
                    </button>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}

      <ConfirmModal
        isOpen={!!toDelete}
        title="Supprimer la note"
        message={`Voulez-vous vraiment supprimer la note « ${toDelete?.title || ''} » ? Cette action est irréversible.`}
        confirmLabel="Supprimer"
        danger
        onConfirm={handleDelete}
        onCancel={() => setToDelete(null)}
      />
    </div>
  )
}
