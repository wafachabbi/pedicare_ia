import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { medicalContactsService } from '../../services/medicalContacts.service'
import ConfirmModal from '../../components/ui/ConfirmModal'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import { useAuth } from '../../hooks/useAuth'

const emptyForm = { type: 'pediatre', name: '', specialty: '', phone: '', email: '', adresse: '', notes: '' }

const TYPES = {
  pediatre: { label: 'Pédiatre', icon: '👩‍⚕️', badge: 'bg-sky-50 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400' },
  specialiste: { label: 'Spécialiste', icon: '🩺', badge: 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400' },
  autre: { label: 'Autre', icon: '🏥', badge: 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300' }
}

const inputClass = 'w-full px-4 py-3 rounded-2xl border-2 border-gray-100 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:border-sky-400 transition-colors'
const labelClass = 'block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2'

export default function MedicalContactsPage() {
  const { childId } = useParams()
  const { user } = useAuth()
  const readOnly = user?.role !== 'parent' // le pédiatre consulte les contacts sans les modifier
  const [contacts, setContacts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [editId, setEditId] = useState(null)
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)

  const load = async () => {
    try {
      setLoading(true)
      const res = await medicalContactsService.getAll(childId)
      setContacts(res.data.data)
    } catch {
      setError('Erreur lors du chargement')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [childId])

  const openCreate = () => { setForm(emptyForm); setEditId(null); setFormError(''); setShowForm(true) }
  const openEdit = (c) => {
    setForm({
      type: c.type, name: c.name, specialty: c.specialty || '', phone: c.phone || '',
      email: c.email || '', adresse: c.adresse || '', notes: c.notes || ''
    })
    setEditId(c._id); setFormError(''); setShowForm(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) { setFormError('Nom requis'); return }
    setSaving(true)
    try {
      if (editId) {
        const res = await medicalContactsService.update(childId, editId, form)
        setContacts(list => list.map(x => x._id === editId ? res.data.data : x))
      } else {
        const res = await medicalContactsService.create(childId, form)
        setContacts(list => [...list, res.data.data])
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
      await medicalContactsService.delete(childId, deleteTarget)
      setContacts(list => list.filter(x => x._id !== deleteTarget))
    } catch {
      setError('Erreur lors de la suppression')
    } finally {
      setDeleteTarget(null)
    }
  }

  if (loading) return <LoadingSpinner />

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 p-6">
      <div className="max-w-3xl mx-auto">

        {/* Header */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-sky-500 to-indigo-400 p-8 mb-8 shadow-xl shadow-sky-200 dark:shadow-sky-900/30">
          <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2" />
          <div className="relative flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="text-4xl">🏥</span>
                <h1 className="text-3xl font-bold text-white">Contacts médicaux</h1>
              </div>
              <p className="text-sky-100 text-sm">{contacts.length} contact{contacts.length !== 1 ? 's' : ''} enregistré{contacts.length !== 1 ? 's' : ''}</p>
            </div>
            {!readOnly && (
              <button
                onClick={openCreate}
                className="flex items-center gap-2 bg-white text-sky-600 font-semibold px-5 py-3 rounded-2xl shadow-lg hover:shadow-xl hover:scale-105 transition-all text-sm"
              >
                <span className="text-lg">+</span> Ajouter
              </button>
            )}
          </div>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl text-red-600 dark:text-red-400 text-sm">{error}</div>
        )}

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
              <div className="bg-gradient-to-r from-sky-500 to-indigo-400 px-6 py-4">
                <h2 className="text-white font-semibold text-lg">
                  {editId ? '✏️ Modifier le contact' : '✨ Nouveau contact'}
                </h2>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className={labelClass}>Type *</label>
                    <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} className={inputClass}>
                      {Object.entries(TYPES).map(([value, t]) => <option key={value} value={value}>{t.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Nom *</label>
                    <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                      className={inputClass} placeholder="ex: Dr. Ben Salah" maxLength={100} />
                  </div>
                  <div>
                    <label className={labelClass}>Spécialité</label>
                    <input value={form.specialty} onChange={e => setForm(f => ({ ...f, specialty: e.target.value }))}
                      className={inputClass} placeholder="ex: ORL, Dermatologue..." />
                  </div>
                  <div>
                    <label className={labelClass}>Téléphone</label>
                    <input type="tel" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                      className={inputClass} placeholder="Optionnel" maxLength={20} />
                  </div>
                  <div>
                    <label className={labelClass}>Email</label>
                    <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                      className={inputClass} placeholder="Optionnel" />
                  </div>
                  <div>
                    <label className={labelClass}>Adresse</label>
                    <input value={form.adresse} onChange={e => setForm(f => ({ ...f, adresse: e.target.value }))}
                      className={inputClass} placeholder="Optionnel" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className={labelClass}>Notes</label>
                    <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                      rows={3} maxLength={500} className={`${inputClass} resize-none`} placeholder="Horaires, informations utiles..." />
                  </div>
                </div>
                {formError && <p className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 px-4 py-2 rounded-xl">{formError}</p>}
                <div className="flex gap-3 pt-2">
                  <button type="submit" disabled={saving}
                    className="flex-1 py-3 bg-gradient-to-r from-sky-500 to-indigo-400 disabled:opacity-50 text-white font-semibold rounded-2xl hover:shadow-lg hover:scale-[1.02] transition-all">
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
        {contacts.length === 0 && !showForm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="text-center py-20 bg-white dark:bg-slate-800 rounded-3xl border-2 border-dashed border-gray-200 dark:border-slate-700">
            <div className="text-6xl mb-4">📋</div>
            <p className="text-gray-500 dark:text-gray-400 font-medium mb-2">Aucun contact médical enregistré</p>
            {!readOnly && (
              <>
                <p className="text-gray-400 dark:text-gray-500 text-sm mb-6">Ajoutez le pédiatre ou les spécialistes qui suivent cet enfant</p>
                <button onClick={openCreate}
                  className="px-6 py-3 bg-gradient-to-r from-sky-500 to-indigo-400 text-white font-semibold rounded-2xl hover:shadow-lg transition-all text-sm">
                  + Ajouter un contact
                </button>
              </>
            )}
          </motion.div>
        )}

        {/* Liste */}
        <div className="space-y-3">
          {contacts.map((c, i) => {
            const t = TYPES[c.type] || TYPES.autre
            return (
              <motion.div
                key={c._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="group bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 p-5 flex items-start gap-4 hover:shadow-lg hover:border-sky-200 dark:hover:border-sky-800 transition-all"
              >
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-sky-400 to-indigo-400 flex items-center justify-center text-xl shadow-md shrink-0">
                  {t.icon}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-gray-800 dark:text-gray-100 truncate">{c.name}</p>
                    <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${t.badge}`}>{t.label}</span>
                    {c.specialty && <span className="text-xs text-gray-500 dark:text-gray-400">· {c.specialty}</span>}
                  </div>
                  <div className="flex items-center gap-x-4 gap-y-1 mt-1 flex-wrap text-sm text-gray-500 dark:text-gray-400">
                    {c.phone && <a href={`tel:${c.phone}`} className="hover:text-sky-600">📞 {c.phone}</a>}
                    {c.email && <a href={`mailto:${c.email}`} className="hover:text-sky-600 truncate">✉️ {c.email}</a>}
                    {c.adresse && <span>📍 {c.adresse}</span>}
                  </div>
                  {c.notes && <p className="text-xs text-gray-400 dark:text-gray-500 mt-2 whitespace-pre-line">{c.notes}</p>}
                </div>

                {!readOnly && (
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity shrink-0">
                    <button onClick={() => openEdit(c)} aria-label="Modifier"
                      className="p-2.5 bg-sky-50 dark:bg-sky-900/20 text-sky-600 dark:text-sky-400 rounded-xl hover:bg-sky-100 dark:hover:bg-sky-900/40 transition-colors text-sm font-medium">
                      ✏️
                    </button>
                    <button onClick={() => setDeleteTarget(c._id)} aria-label="Supprimer"
                      className="p-2.5 bg-red-50 dark:bg-red-900/20 text-red-500 rounded-xl hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors text-sm">
                      🗑️
                    </button>
                  </div>
                )}
              </motion.div>
            )
          })}
        </div>
      </div>

      <ConfirmModal
        isOpen={!!deleteTarget}
        title="Supprimer le contact"
        message="Supprimer ce contact médical ?"
        confirmLabel="Supprimer"
        danger
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}
