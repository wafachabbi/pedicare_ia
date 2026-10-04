import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { vaccinationsService } from '../../services/vaccinations.service'
import ConfirmModal from '../../components/ui/ConfirmModal'
import LoadingSpinner from '../../components/ui/LoadingSpinner'

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
      setError('Erreur lors du chargement')
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 p-6">
      <div className="max-w-3xl mx-auto">

        {/* Header */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-500 to-teal-400 p-8 mb-8 shadow-xl shadow-emerald-200 dark:shadow-emerald-900/30">
          <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2" />
          <div className="relative flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="text-4xl">💉</span>
                <h1 className="text-3xl font-bold text-white">Vaccinations</h1>
              </div>
              <p className="text-emerald-100 text-sm">{vaccinations.length} vaccination{vaccinations.length !== 1 ? 's' : ''} enregistrée{vaccinations.length !== 1 ? 's' : ''}</p>
            </div>
            <button
              onClick={openCreate}
              className="flex items-center gap-2 bg-white text-emerald-600 font-semibold px-5 py-3 rounded-2xl shadow-lg hover:shadow-xl hover:scale-105 transition-all text-sm"
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
              <div className="bg-gradient-to-r from-emerald-500 to-teal-400 px-6 py-4">
                <h2 className="text-white font-semibold text-lg">
                  {editId ? '✏️ Modifier la vaccination' : '✨ Nouvelle vaccination'}
                </h2>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Nom du vaccin *</label>
                    <input
                      value={form.vaccineName}
                      onChange={e => setForm(f => ({ ...f, vaccineName: e.target.value }))}
                      className="w-full px-4 py-3 rounded-2xl border-2 border-gray-100 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:border-emerald-400 transition-colors"
                      placeholder="ex: BCG, DTP, ROR..."
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Date d'administration *</label>
                    <input
                      type="date"
                      value={form.administeredAt}
                      onChange={e => setForm(f => ({ ...f, administeredAt: e.target.value }))}
                      className="w-full px-4 py-3 rounded-2xl border-2 border-gray-100 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:border-emerald-400 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Numéro de lot</label>
                    <input
                      value={form.lotNumber}
                      onChange={e => setForm(f => ({ ...f, lotNumber: e.target.value }))}
                      className="w-full px-4 py-3 rounded-2xl border-2 border-gray-100 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:border-emerald-400 transition-colors"
                      placeholder="Optionnel"
                    />
                  </div>
                </div>
                {formError && <p className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 px-4 py-2 rounded-xl">{formError}</p>}
                <div className="flex gap-3 pt-2">
                  <button type="submit" disabled={saving}
                    className="flex-1 py-3 bg-gradient-to-r from-emerald-500 to-teal-400 disabled:opacity-50 text-white font-semibold rounded-2xl hover:shadow-lg hover:scale-[1.02] transition-all">
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
        {vaccinations.length === 0 && !showForm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="text-center py-20 bg-white dark:bg-slate-800 rounded-3xl border-2 border-dashed border-gray-200 dark:border-slate-700">
            <div className="text-6xl mb-4">💉</div>
            <p className="text-gray-500 dark:text-gray-400 font-medium mb-2">Aucune vaccination enregistrée</p>
            <p className="text-gray-400 dark:text-gray-500 text-sm mb-6">Ajoutez la première vaccination de cet enfant</p>
            <button onClick={openCreate}
              className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-400 text-white font-semibold rounded-2xl hover:shadow-lg transition-all text-sm">
              + Ajouter une vaccination
            </button>
          </motion.div>
        )}

        {/* Liste */}
        <div className="space-y-3">
          {vaccinations.map((v, i) => (
            <motion.div
              key={v._id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="group bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 p-5 flex items-center gap-4 hover:shadow-lg hover:border-emerald-200 dark:hover:border-emerald-800 transition-all"
            >
              {/* Icône */}
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-400 flex items-center justify-center text-xl shadow-md shrink-0">
                💉
              </div>

              {/* Infos */}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-800 dark:text-gray-100 truncate">{v.vaccineName}</p>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    📅 {new Date(v.administeredAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </span>
                  {v.lotNumber && (
                    <span className="text-xs bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 px-2.5 py-0.5 rounded-full font-medium">
                      Lot {v.lotNumber}
                    </span>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                <button onClick={() => openEdit(v)}
                  className="p-2.5 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-xl hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors text-sm font-medium">
                  ✏️
                </button>
                <button onClick={() => setDeleteTarget(v._id)}
                  className="p-2.5 bg-red-50 dark:bg-red-900/20 text-red-500 rounded-xl hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors text-sm">
                  🗑️
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      <ConfirmModal
        isOpen={!!deleteTarget}
        message="Supprimer cette vaccination ?"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}
