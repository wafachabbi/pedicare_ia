import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { appointmentsService } from '../../services/appointments.service'
import ConfirmModal from '../../components/ui/ConfirmModal'
import LoadingSpinner from '../../components/ui/LoadingSpinner'

const emptyForm = { type: 'consultation', dateTime: '', practitioner: '', notes: '' }

const TYPE_CONFIG = {
  consultation: { label: 'Consultation', icon: '🩺', color: 'from-sky-500 to-blue-400', bg: 'bg-sky-50 dark:bg-sky-900/20', text: 'text-sky-600 dark:text-sky-400' },
  exam: { label: 'Examen', icon: '🔬', color: 'from-violet-500 to-purple-400', bg: 'bg-violet-50 dark:bg-violet-900/20', text: 'text-violet-600 dark:text-violet-400' }
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
      setError('Erreur lors du chargement')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [childId])

  const openCreate = () => { setForm(emptyForm); setEditId(null); setFormError(''); setShowForm(true) }
  const openEdit = (a) => {
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

  const upcoming = appointments.filter(a => a.status === 'upcoming')
  const past = appointments.filter(a => a.status === 'past')

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-violet-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 p-6">
      <div className="max-w-3xl mx-auto">

        {/* Header */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-sky-500 to-violet-500 p-8 mb-8 shadow-xl shadow-sky-200 dark:shadow-sky-900/30">
          <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2" />
          <div className="relative flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="text-4xl">📅</span>
                <h1 className="text-3xl font-bold text-white">Rendez-vous</h1>
              </div>
              <div className="flex items-center gap-4 text-sky-100 text-sm">
                <span>✅ {upcoming.length} à venir</span>
                <span>📁 {past.length} passé{past.length !== 1 ? 's' : ''}</span>
              </div>
            </div>
            <button
              onClick={openCreate}
              className="flex items-center gap-2 bg-white text-sky-600 font-semibold px-5 py-3 rounded-2xl shadow-lg hover:shadow-xl hover:scale-105 transition-all text-sm"
            >
              <span className="text-lg">+</span> Ajouter
            </button>
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
              <div className="bg-gradient-to-r from-sky-500 to-violet-500 px-6 py-4">
                <h2 className="text-white font-semibold text-lg">
                  {editId ? '✏️ Modifier le rendez-vous' : '✨ Nouveau rendez-vous'}
                </h2>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-5">
                {/* Sélecteur de type */}
                <div>
                  <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">Type *</label>
                  <div className="flex gap-3">
                    {Object.entries(TYPE_CONFIG).map(([value, cfg]) => (
                      <button key={value} type="button" onClick={() => setForm(f => ({ ...f, type: value }))}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl border-2 text-sm font-medium transition-all ${
                          form.type === value
                            ? `border-sky-400 bg-sky-50 dark:bg-sky-900/20 text-sky-700 dark:text-sky-400`
                            : 'border-gray-100 dark:border-slate-600 text-gray-500 hover:border-gray-200 bg-gray-50 dark:bg-slate-700'
                        }`}>
                        <span>{cfg.icon}</span> {cfg.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Date et heure *</label>
                    <input type="datetime-local" value={form.dateTime} onChange={e => setForm(f => ({ ...f, dateTime: e.target.value }))}
                      className="w-full px-4 py-3 rounded-2xl border-2 border-gray-100 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:border-sky-400 transition-colors" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Praticien</label>
                    <input value={form.practitioner} onChange={e => setForm(f => ({ ...f, practitioner: e.target.value }))}
                      className="w-full px-4 py-3 rounded-2xl border-2 border-gray-100 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:border-sky-400 transition-colors"
                      placeholder="Dr. [Nom]" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Notes</label>
                    <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={3}
                      className="w-full px-4 py-3 rounded-2xl border-2 border-gray-100 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:border-sky-400 transition-colors resize-none"
                      placeholder="Observations, instructions..." />
                  </div>
                </div>

                {formError && <p className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 px-4 py-2 rounded-xl">{formError}</p>}
                <div className="flex gap-3 pt-2">
                  <button type="submit" disabled={saving}
                    className="flex-1 py-3 bg-gradient-to-r from-sky-500 to-violet-500 disabled:opacity-50 text-white font-semibold rounded-2xl hover:shadow-lg hover:scale-[1.02] transition-all">
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
        {appointments.length === 0 && !showForm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="text-center py-20 bg-white dark:bg-slate-800 rounded-3xl border-2 border-dashed border-gray-200 dark:border-slate-700">
            <div className="text-6xl mb-4">📅</div>
            <p className="text-gray-500 dark:text-gray-400 font-medium mb-2">Aucun rendez-vous enregistré</p>
            <p className="text-gray-400 dark:text-gray-500 text-sm mb-6">Planifiez le premier rendez-vous de cet enfant</p>
            <button onClick={openCreate}
              className="px-6 py-3 bg-gradient-to-r from-sky-500 to-violet-500 text-white font-semibold rounded-2xl hover:shadow-lg transition-all text-sm">
              + Ajouter un rendez-vous
            </button>
          </motion.div>
        )}

        {/* Section À venir */}
        {upcoming.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-2 h-2 bg-sky-400 rounded-full" />
              <h2 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">À venir</h2>
              <span className="bg-sky-100 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400 text-xs font-semibold px-2.5 py-0.5 rounded-full">{upcoming.length}</span>
            </div>
            <div className="space-y-3">
              {upcoming.map((a, i) => <AppointmentCard key={a._id} a={a} index={i} onEdit={openEdit} onDelete={setDeleteTarget} />)}
            </div>
          </div>
        )}

        {/* Section Passés */}
        {past.length > 0 && (
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-2 h-2 bg-gray-300 rounded-full" />
              <h2 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">Passés</h2>
              <span className="bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-gray-400 text-xs font-semibold px-2.5 py-0.5 rounded-full">{past.length}</span>
            </div>
            <div className="space-y-3 opacity-75">
              {past.map((a, i) => <AppointmentCard key={a._id} a={a} index={i} onEdit={openEdit} onDelete={setDeleteTarget} />)}
            </div>
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={!!deleteTarget}
        message="Supprimer ce rendez-vous ?"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}

function AppointmentCard({ a, index, onEdit, onDelete }) {
  const cfg = TYPE_CONFIG[a.type] || TYPE_CONFIG.consultation
  const dateObj = new Date(a.dateTime)
  const isUpcoming = a.status === 'upcoming'

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="group bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 p-5 flex items-start gap-4 hover:shadow-lg hover:border-sky-200 dark:hover:border-sky-800 transition-all"
    >
      {/* Date block */}
      <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${cfg.color} flex flex-col items-center justify-center shadow-md shrink-0`}>
        <span className="text-white text-lg font-bold leading-none">{dateObj.getDate()}</span>
        <span className="text-white/80 text-xs leading-none mt-0.5">
          {dateObj.toLocaleDateString('fr-FR', { month: 'short' })}
        </span>
      </div>

      {/* Infos */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${cfg.bg} ${cfg.text}`}>
            {cfg.icon} {cfg.label}
          </span>
          {isUpcoming && (
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400">
              À venir
            </span>
          )}
        </div>
        <p className="font-semibold text-gray-800 dark:text-gray-100">
          {dateObj.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
          {' · '}
          <span className="text-sky-500 dark:text-sky-400">
            {dateObj.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
          </span>
        </p>
        {a.practitioner && <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">👨‍⚕️ {a.practitioner}</p>}
        {a.notes && <p className="text-sm text-gray-400 dark:text-gray-500 mt-1 truncate">📝 {a.notes}</p>}
      </div>

      {/* Actions */}
      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        <button onClick={() => onEdit(a)}
          className="p-2.5 bg-sky-50 dark:bg-sky-900/20 text-sky-600 dark:text-sky-400 rounded-xl hover:bg-sky-100 dark:hover:bg-sky-900/40 transition-colors">
          ✏️
        </button>
        <button onClick={() => onDelete(a._id)}
          className="p-2.5 bg-red-50 dark:bg-red-900/20 text-red-500 rounded-xl hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors">
          🗑️
        </button>
      </div>
    </motion.div>
  )
}
