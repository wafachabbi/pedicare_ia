import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { vaccinationsService } from '../../services/vaccinations.service'
import ConfirmModal from '../../components/ui/ConfirmModal'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import ErrorMessage from '../../components/ui/ErrorMessage'

const emptyForm = { vaccineName: '', administeredAt: '', lotNumber: '' }

export default function VaccinationsPage() {
  const { childId } = useParams()
  const [vaccinations, setVaccinations] = useState([])
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
      const res = await vaccinationsService.getAll(childId)
      setVaccinations(res.data.data)
    } catch {
      setError('Erreur lors du chargement des vaccinations')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [childId])

  const openCreate = () => { setForm(emptyForm); setEditId(null); setFormError(''); setShowForm(true) }
  const openEdit = (v) => {
    setForm({ vaccineName: v.vaccineName, administeredAt: v.administeredAt.slice(0, 10), lotNumber: v.lotNumber || '' })
    setEditId(v._id); setFormError(''); setShowForm(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.vaccineName || !form.administeredAt) { setFormError('Nom et date requis'); return }
    setSaving(true)
    try {
      if (editId) {
        const res = await vaccinationsService.update(childId, editId, form)
        setVaccinations(v => v.map(x => x._id === editId ? res.data.data : x))
      } else {
        const res = await vaccinationsService.create(childId, form)
        setVaccinations(v => [res.data.data, ...v])
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
      await vaccinationsService.delete(childId, deleteTarget)
      setVaccinations(v => v.filter(x => x._id !== deleteTarget))
    } catch {
      setError('Erreur lors de la suppression')
    } finally {
      setDeleteTarget(null)
    }
  }

  if (loading) return <LoadingSpinner />
  if (error) return <ErrorMessage message={error} />

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">💉 Vaccinations</h1>
        <button onClick={openCreate} className="px-4 py-2 bg-mint-500 hover:bg-mint-400 text-white rounded-xl text-sm font-medium transition-colors">
          + Ajouter
        </button>
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className="glass-card p-6 mb-6">
            <h2 className="font-semibold text-gray-700 dark:text-gray-200 mb-4">
              {editId ? 'Modifier la vaccination' : 'Nouvelle vaccination'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nom du vaccin *</label>
                <input value={form.vaccineName} onChange={e => setForm(f => ({ ...f, vaccineName: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-mint-400"
                  placeholder="ex: BCG, DTP..." />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date d'administration *</label>
                <input type="date" value={form.administeredAt} onChange={e => setForm(f => ({ ...f, administeredAt: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-mint-400" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Numéro de lot</label>
                <input value={form.lotNumber} onChange={e => setForm(f => ({ ...f, lotNumber: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-mint-400"
                  placeholder="optionnel" />
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

      {vaccinations.length === 0 ? (
        <div className="text-center py-12 text-gray-400 dark:text-gray-500">
          <p className="text-4xl mb-3">💉</p>
          <p>Aucune vaccination enregistrée</p>
        </div>
      ) : (
        <div className="space-y-3">
          {vaccinations.map(v => (
            <motion.div key={v._id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="glass-card p-4 flex items-center justify-between gap-4">
              <div>
                <p className="font-semibold text-gray-800 dark:text-gray-100">{v.vaccineName}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {new Date(v.administeredAt).toLocaleDateString('fr-FR')}
                  {v.lotNumber && <span className="ml-2 text-xs bg-gray-100 dark:bg-slate-700 px-2 py-0.5 rounded-full">Lot: {v.lotNumber}</span>}
                </p>
              </div>
              <div className="flex gap-2 shrink-0">
                <button onClick={() => openEdit(v)} className="text-sm text-mint-500 hover:text-mint-400 font-medium">Modifier</button>
                <button onClick={() => setDeleteTarget(v._id)} className="text-sm text-red-400 hover:text-red-500 font-medium">Supprimer</button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <ConfirmModal
        isOpen={!!deleteTarget}
        message="Supprimer cette vaccination ?"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}
