import { useState, useEffect, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { documentsService } from '../../services/documents.service'
import ConfirmModal from '../../components/ui/ConfirmModal'
import LoadingSpinner from '../../components/ui/LoadingSpinner'

const CATEGORIES = [
  { value: 'ordonnance', label: '💊 Ordonnance', color: 'text-orange-600 bg-orange-50 dark:bg-orange-900/30 dark:text-orange-400' },
  { value: 'résultat', label: '🔬 Résultat d\'analyse', color: 'text-blue-600 bg-blue-50 dark:bg-blue-900/30 dark:text-blue-400' },
  { value: 'compte-rendu', label: '📋 Compte-rendu', color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 dark:text-emerald-400' },
  { value: 'autre', label: '📎 Autre', color: 'text-gray-600 bg-gray-100 dark:bg-slate-700 dark:text-gray-400' }
]

const getCategoryStyle = (cat) => CATEGORIES.find(c => c.value === cat) ?? CATEGORIES[3]

const getMimeIcon = (mimetype) => {
  if (mimetype === 'application/pdf') return '📄'
  if (mimetype?.startsWith('image/')) return '🖼️'
  return '📎'
}

const formatSize = (bytes) => {
  if (bytes < 1024) return `${bytes} o`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`
}

const emptyForm = { category: 'autre', notes: '', date: '' }

export default function DocumentsPage() {
  const { childId } = useParams()

  // ── État ──────────────────────────────────────────────────────────────────
  const [documents, setDocuments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [selectedFile, setSelectedFile] = useState(null)
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [filterCat, setFilterCat] = useState('all')
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef(null)

  // ── Chargement ────────────────────────────────────────────────────────────
  const load = async () => {
    try {
      setLoading(true)
      const res = await documentsService.getAll(childId)
      setDocuments(res.data.data)
    } catch {
      setError('Erreur lors du chargement des documents')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [childId])

  // ── Gestion fichier (drag & drop + input) ─────────────────────────────────
  const handleFileSelect = (file) => {
    if (!file) return
    const allowed = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
    if (!allowed.includes(file.type)) {
      setFormError('Format non supporté. Utilisez PDF, JPEG, PNG ou WEBP.')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      setFormError('Fichier trop volumineux (max 10 Mo)')
      return
    }
    setSelectedFile(file)
    setFormError('')
    if (!form.date) {
      setForm(f => ({ ...f, date: new Date().toISOString().slice(0, 10) }))
    }
    setShowForm(true)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    handleFileSelect(file)
  }

  // ── Upload ────────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!selectedFile) { setFormError('Veuillez sélectionner un fichier'); return }
    setSaving(true)
    try {
      const fd = new FormData()
      fd.append('file', selectedFile)
      fd.append('category', form.category)
      fd.append('notes', form.notes)
      fd.append('date', form.date || new Date().toISOString().slice(0, 10))
      const res = await documentsService.upload(childId, fd)
      setDocuments(d => [res.data.data, ...d])
      setShowForm(false)
      setSelectedFile(null)
      setForm(emptyForm)
    } catch (err) {
      setFormError(err.response?.data?.error?.message || 'Erreur lors de l\'upload')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    try {
      await documentsService.delete(childId, deleteTarget)
      setDocuments(d => d.filter(x => x._id !== deleteTarget))
    } catch {
      setError('Erreur lors de la suppression')
    } finally {
      setDeleteTarget(null)
    }
  }

  // ── Ouverture fichier ──────────────────────────────────────────────────────
  const openFile = (doc) => {
    const url = `/api/children/${childId}/documents/${doc._id}/file`
    // Ajouter le token en querystring pour les fichiers statiques
    const token = localStorage.getItem('pedicare_token')
    window.open(`${url}?token=${token}`, '_blank', 'noopener,noreferrer')
  }

  // ── Filtrage ──────────────────────────────────────────────────────────────
  const filtered = filterCat === 'all' ? documents : documents.filter(d => d.category === filterCat)

  const cancelForm = () => {
    setShowForm(false)
    setSelectedFile(null)
    setForm(emptyForm)
    setFormError('')
  }

  if (loading) return <LoadingSpinner />

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-orange-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 p-6">
      <div className="max-w-3xl mx-auto">

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-rose-500 to-orange-400 p-8 mb-8 shadow-xl shadow-rose-200 dark:shadow-rose-900/30">
          <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2" />
          <div className="relative flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="text-4xl">🗂️</span>
                <h1 className="text-3xl font-bold text-white">Documents médicaux</h1>
              </div>
              <p className="text-rose-100 text-sm">{documents.length} document{documents.length !== 1 ? 's' : ''} enregistré{documents.length !== 1 ? 's' : ''}</p>
            </div>
            <button
              onClick={() => { setForm(emptyForm); setSelectedFile(null); setFormError(''); setShowForm(true) }}
              className="flex items-center gap-2 bg-white text-rose-600 font-semibold px-5 py-3 rounded-2xl shadow-lg hover:shadow-xl hover:scale-105 transition-all text-sm"
            >
              <span className="text-lg">+</span> Ajouter
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl text-red-600 dark:text-red-400 text-sm">{error}</div>
        )}

        {/* ── Formulaire upload ───────────────────────────────────────────── */}
        <AnimatePresence>
          {showForm && (
            <motion.div
              initial={{ opacity: 0, scale: 0.97, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: -10 }}
              transition={{ duration: 0.2 }}
              className="mb-6 bg-white dark:bg-slate-800 rounded-3xl shadow-xl border border-gray-100 dark:border-slate-700 overflow-hidden"
            >
              <div className="bg-gradient-to-r from-rose-500 to-orange-400 px-6 py-4">
                <h2 className="text-white font-semibold text-lg">📎 Ajouter un document</h2>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-5">

                {/* Zone drag & drop */}
                <div
                  onDrop={handleDrop}
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
                  onDragLeave={() => setDragOver(false)}
                  onClick={() => fileInputRef.current?.click()}
                  className={`relative border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
                    dragOver
                      ? 'border-rose-400 bg-rose-50 dark:bg-rose-900/20'
                      : selectedFile
                        ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-900/20'
                        : 'border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 hover:border-rose-300 hover:bg-rose-50 dark:hover:bg-rose-900/10'
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,.webp"
                    className="hidden"
                    onChange={e => handleFileSelect(e.target.files?.[0])}
                  />
                  {selectedFile ? (
                    <div className="flex items-center justify-center gap-3">
                      <span className="text-3xl">{getMimeIcon(selectedFile.type)}</span>
                      <div className="text-left">
                        <p className="font-semibold text-emerald-700 dark:text-emerald-300 text-sm truncate max-w-xs">{selectedFile.name}</p>
                        <p className="text-xs text-emerald-600 dark:text-emerald-400">{formatSize(selectedFile.size)}</p>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setSelectedFile(null) }}
                        className="ml-2 text-gray-400 hover:text-red-500 transition-colors text-lg"
                      >✕</button>
                    </div>
                  ) : (
                    <div>
                      <div className="text-4xl mb-3">☁️</div>
                      <p className="text-gray-600 dark:text-gray-300 font-medium text-sm">Glisser-déposer un fichier ici</p>
                      <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">ou cliquer pour sélectionner</p>
                      <p className="text-gray-300 dark:text-gray-600 text-xs mt-2">PDF, JPEG, PNG, WEBP · max 10 Mo</p>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  {/* Catégorie */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Catégorie</label>
                    <select
                      value={form.category}
                      onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                      className="w-full px-4 py-3 rounded-2xl border-2 border-gray-100 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:border-rose-400 transition-colors"
                    >
                      {CATEGORIES.map(c => (
                        <option key={c.value} value={c.value}>{c.label}</option>
                      ))}
                    </select>
                  </div>
                  {/* Date */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Date du document</label>
                    <input
                      type="date"
                      value={form.date}
                      onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                      className="w-full px-4 py-3 rounded-2xl border-2 border-gray-100 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:border-rose-400 transition-colors"
                    />
                  </div>
                  {/* Notes */}
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Notes (optionnel)</label>
                    <textarea
                      value={form.notes}
                      onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                      rows={2}
                      maxLength={500}
                      className="w-full px-4 py-3 rounded-2xl border-2 border-gray-100 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:border-rose-400 transition-colors resize-none"
                      placeholder="Ex: Ordonnance du Dr. Martin du 22/10/2026..."
                    />
                  </div>
                </div>

                {formError && (
                  <p className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 px-4 py-2 rounded-xl">{formError}</p>
                )}
                <div className="flex gap-3 pt-2">
                  <button type="submit" disabled={saving || !selectedFile}
                    className="flex-1 py-3 bg-gradient-to-r from-rose-500 to-orange-400 disabled:opacity-50 text-white font-semibold rounded-2xl hover:shadow-lg hover:scale-[1.02] transition-all">
                    {saving ? 'Envoi en cours...' : '📤 Envoyer le document'}
                  </button>
                  <button type="button" onClick={cancelForm}
                    className="flex-1 py-3 bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 font-semibold rounded-2xl hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors">
                    Annuler
                  </button>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── État vide ───────────────────────────────────────────────────── */}
        {documents.length === 0 && !showForm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="text-center py-20 bg-white dark:bg-slate-800 rounded-3xl border-2 border-dashed border-gray-200 dark:border-slate-700">
            <div className="text-6xl mb-4">🗂️</div>
            <p className="text-gray-500 dark:text-gray-400 font-medium mb-2">Aucun document enregistré</p>
            <p className="text-gray-400 dark:text-gray-500 text-sm mb-6">Ajoutez des ordonnances, résultats d'analyses ou comptes-rendus</p>
            <button
              onClick={() => { setForm(emptyForm); setSelectedFile(null); setShowForm(true) }}
              className="px-6 py-3 bg-gradient-to-r from-rose-500 to-orange-400 text-white font-semibold rounded-2xl hover:shadow-lg transition-all text-sm">
              + Ajouter un document
            </button>
          </motion.div>
        )}

        {/* ── Filtres ─────────────────────────────────────────────────────── */}
        {documents.length > 0 && (
          <div className="flex gap-2 mb-5 flex-wrap">
            <button
              onClick={() => setFilterCat('all')}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                filterCat === 'all'
                  ? 'bg-rose-500 text-white shadow-md'
                  : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-slate-600'
              }`}
            >
              Tous ({documents.length})
            </button>
            {CATEGORIES.map(cat => {
              const count = documents.filter(d => d.category === cat.value).length
              if (count === 0) return null
              return (
                <button
                  key={cat.value}
                  onClick={() => setFilterCat(cat.value)}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                    filterCat === cat.value
                      ? 'bg-rose-500 text-white shadow-md'
                      : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-slate-600'
                  }`}
                >
                  {cat.label} ({count})
                </button>
              )
            })}
          </div>
        )}

        {/* ── Liste des documents ─────────────────────────────────────────── */}
        <div className="space-y-3">
          {filtered.map((doc, i) => {
            const catStyle = getCategoryStyle(doc.category)
            return (
              <motion.div
                key={doc._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="group bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 p-5 flex items-center gap-4 hover:shadow-lg hover:border-rose-200 dark:hover:border-rose-800 transition-all"
              >
                {/* Icône fichier */}
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-rose-400 to-orange-400 flex items-center justify-center text-xl shadow-md shrink-0">
                  {getMimeIcon(doc.mimetype)}
                </div>

                {/* Infos */}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-800 dark:text-gray-100 truncate text-sm">{doc.originalName}</p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${catStyle.color}`}>
                      {catStyle.label}
                    </span>
                    <span className="text-xs text-gray-400 dark:text-gray-500">
                      {new Date(doc.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                    <span className="text-xs text-gray-300 dark:text-gray-600">{formatSize(doc.size)}</span>
                  </div>
                  {doc.notes && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate italic">{doc.notes}</p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  <button
                    onClick={() => openFile(doc)}
                    className="p-2.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-xl hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors text-sm"
                    title="Ouvrir"
                  >
                    👁️
                  </button>
                  <button
                    onClick={() => setDeleteTarget(doc._id)}
                    className="p-2.5 bg-red-50 dark:bg-red-900/20 text-red-500 rounded-xl hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors text-sm"
                    title="Supprimer"
                  >
                    🗑️
                  </button>
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>

      <ConfirmModal
        isOpen={!!deleteTarget}
        message="Supprimer ce document ? Le fichier sera définitivement effacé."
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        danger
      />
    </div>
  )
}
