import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { appointmentsService } from '../../services/appointments.service'
import ConfirmModal from '../../components/ui/ConfirmModal'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import ErrorMessage from '../../components/ui/ErrorMessage'

const emptyForm = { type: 'consultation', dateTime: '', practitioner: '', notes: '' }

const TYPE_LABELS = { consultation: 'Consultation', exam: 'Examen' }
const STATUS_STYLES = {
  upcoming: 'bg-mint-50 text-mint-700 dark:bg-mint-900/20 dark:text-mint-400',
  past: 'bg-gray-100 text-gray-500 dark:bg-slate-700 dark:text-gray-400'
}

export default function AppointmentsPage() {
  const { childId } = useParams()
  const [appointments, setAppointments] = useState([])
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
      const res = await appointmentsService.getAll(childId)
      setAppointments(res.data.data)
    } catch {
      setError('Erreur lors du chargement des rendez-vous')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [childId])

  const openCreate = () => { setForm(emptyForm); setEditId(null); setFormError(''); setShowForm(true) }
  const openEdit = (a) => {
    // Convertir dateTime ISO en format datetime-local
    const dt = new Date(a.dateTime)
    const local = new Date(dt.getTime() - dt.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
    setForm({ type: a.type, dateTime: local, practitioner: a.practitioner || '', notes: a.notes || '' })
    setEditId(a._id); setFormError(''); setShowForm(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.type || !form.dateTime) { setFormError('Type et date/heure requis'); return }
    setSaving(true)
    try {
      if (editId) {
        const res = await appointmentsService.update(childId, editId, form)
        setAppointments(a => a.map(x => x._id === editId ? res.data.data : x))
      } else {
        const res = await appointmentsService.create(childId, form)
        setAppointments(a => [...a, res.data.data].sort((x, y) => new Date(x.dateTime) - new Date(y.dateTime)))
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
      await appointmentsService.delete(childId, deleteTarget)
      setAppointments(a => a.filter(x => x._id !== deleteTarget))
    } catch {
      setError('Erreur lors de la suppression')
    } finally {
      setDeleteTarget(null)
    }
  }

  if (loading) return <LoadingSpinner />
  if (error) return <ErrorMessage message={error} />

  const upcoming = appointments.filter(a => a.status === 'upcoming')
  const past = appointments.filter(a => a.status === 'past')

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">📅 Rendez-vous</h1>
        <button onClick={openCreate} className="px-4 py-2 bg-mint-500 hover:bg-mint-400 text-white rounded-xl text-sm font-medium transition-colors">
          + Ajouter
        </button>
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className="glass-card p-6 mb-6">
            <h2 className="font-semibold text-gray-700 dark:text-gray-200 mb-4">
              {editId ? 'Modifier le rendez-vous' : 'Nouveau rendez-vous'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Type *</label>
                <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-mint-400">
                  <option value="consultation">Consultation</option>
                  <option value="exam">Examen</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date et heure *</label>
                <input type="datetime-local" value={form.dateTime} onChange={e => setForm(f => ({ ...f, dateTime: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-mint-400" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Praticien</label>
                <input value={form.practitioner} onChange={e => setForm(f => ({ ...f, practitioner: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-mint-400"
                  placeholder="Dr. [Nom]" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes</label>
                <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={3}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-mint-400 resize-none"
                  placeholder="Observations, instructions..." />
              </div>
              {formError && <p className="text-sm text-red-500">{formError}</p>}
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={saving}
                  className="flex-1 py-2.5 bg-mint-500 hover:bg-mint-400 disabled:opacity-50 text-white font-semibold rounded-xl transition-colors">
                  {saving ? 'Enregistrement...' : 'Enregistrer'}
                </button>
                <button type="button" onClick={() => setShowForm(false)}
                  className="flex-1 py-2.5 border border-gray-200 dark:border-slate-600 text-gray-600 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors">
                  Annuler
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {appointments.length === 0 ? (
        <div className="text-center py-12 text-gray-400 dark:text-gray-500">
          <p className="text-4xl mb-3">📅</p>
          <p>Aucun rendez-vous enregistré</p>
        </div>
      ) : (
        <div className="space-y-6">
          {upcoming.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">À venir</h2>
              <div className="space-y-3">
                {upcoming.map(a => <AppointmentCard key={a._id} a={a} onEdit={openEdit} onDelete={setDeleteTarget} />)}
              </div>
            </div>
          )}
          {past.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">Passés</h2>
              <div className="space-y-3">
                {past.map(a => <AppointmentCard key={a._id} a={a} onEdit={openEdit} onDelete={setDeleteTarget} />)}
              </div>
            </div>
          )}
        </div>
      )}

      <ConfirmModal
        isOpen={!!deleteTarget}
        message="Supprimer ce rendez-vous ?"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}

function AppointmentCard({ a, onEdit, onDelete }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      className="glass-card p-4 flex items-start justify-between gap-4">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${a.status === 'upcoming' ? 'bg-mint-50 text-mint-700 dark:bg-mint-900/20 dark:text-mint-400' : 'bg-gray-100 text-gray-500 dark:bg-slate-700 dark:text-gray-400'}`}>
            {TYPE_LABELS[a.type]}
          </span>
        </div>
        <p className="font-semibold text-gray-800 dark:text-gray-100">
          {new Date(a.dateTime).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })}
          {' '}à{' '}
          {new Date(a.dateTime).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
        </p>
        {a.practitioner && <p className="text-sm text-gray-500 dark:text-gray-400">{a.practitioner}</p>}
        {a.notes && <p className="text-sm text-gray-400 dark:text-gray-500 mt-1 truncate">{a.notes}</p>}
      </div>
      <div className="flex gap-2 shrink-0">
        <button onClick={() => onEdit(a)} className="text-sm text-mint-500 hover:text-mint-400 font-medium">Modifier</button>
        <button onClick={() => onDelete(a._id)} className="text-sm text-red-400 hover:text-red-500 font-medium">Supprimer</button>
      </div>
    </motion.div>
  )
}
