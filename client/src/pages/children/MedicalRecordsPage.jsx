import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { medicalRecordsService } from '../../services/medicalRecords.service'
import ConfirmModal from '../../components/ui/ConfirmModal'
import LoadingSpinner from '../../components/ui/LoadingSpinner'

const TABS = {
  allergie: { label: 'Allergies', icon: '🚫', singular: 'allergie', placeholder: 'ex: Arachides, Pénicilline, Pollen...' },
  antecedent: { label: 'Antécédents médicaux', icon: '📋', singular: 'antécédent', placeholder: 'ex: Asthme, Bronchiolite, Opération des amygdales...' }
}

const SEVERITIES = {
  legere: { label: 'Légère', badge: 'bg-yellow-50 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400' },
  moderee: { label: 'Modérée', badge: 'bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400' },
  severe: { label: 'Sévère', badge: 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400' }
}

const emptyForm = (type) => ({ type, name: '', severity: '', reaction: '', diagnosedAt: '', treatment: '', active: true, notes: '' })

const inputClass = 'w-full px-4 py-3 rounded-2xl border-2 border-gray-100 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:border-rose-400 transition-colors'
const labelClass = 'block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2'

export default function MedicalRecordsPage() {
  const { childId } = useParams()
  const [records, setRecords] = useState([])
  const [tab, setTab] = useState('allergie')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm('allergie'))
  const [editId, setEditId] = useState(null)
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)

  const load = async () => {
    try {
      setLoading(true)
      const res = await medicalRecordsService.getAll(childId)
      setRecords(res.data.data)
    } catch {
      setError('Erreur lors du chargement')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [childId])

  const switchTab = (t) => { setTab(t); setShowForm(false) }
  const openCreate = () => { setForm(emptyForm(tab)); setEditId(null); setFormError(''); setShowForm(true) }
  const openEdit = (r) => {
    setForm({
      type: r.type, name: r.name, severity: r.severity || '', reaction: r.reaction || '',
      diagnosedAt: r.diagnosedAt ? r.diagnosedAt.slice(0, 10) : '', treatment: r.treatment || '',
      active: r.active, notes: r.notes || ''
    })
    setEditId(r._id); setFormError(''); setShowForm(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) { setFormError('Nom requis'); return }
    setSaving(true)
    try {
      if (editId) {
        const res = await medicalRecordsService.update(childId, editId, form)
        setRecords(list => list.map(x => x._id === editId ? res.data.data : x))
      } else {
        const res = await medicalRecordsService.create(childId, form)
        setRecords(list => [res.data.data, ...list])
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
      await medicalRecordsService.delete(childId, deleteTarget)
      setRecords(list => list.filter(x => x._id !== deleteTarget))
    } catch {
      setError('Erreur lors de la suppression')
    } finally {
      setDeleteTarget(null)
    }
  }

  if (loading) return <LoadingSpinner />

  const current = TABS[tab]
  const visible = records.filter(r => r.type === tab)
  const isAllergy = form.type === 'allergie'

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-pink-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 p-6">
      <div className="max-w-3xl mx-auto">

        {/* Header */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-rose-500 to-pink-400 p-8 mb-6 shadow-xl shadow-rose-200 dark:shadow-rose-900/30">
          <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2" />
          <div className="relative flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="text-4xl">🩹</span>
                <h1 className="text-3xl font-bold text-white">Allergies & Antécédents</h1>
              </div>
              <p className="text-rose-100 text-sm">
                {records.filter(r => r.type === 'allergie').length} allergie(s) · {records.filter(r => r.type === 'antecedent').length} antécédent(s)
              </p>
            </div>
            <button
              onClick={openCreate}
              className="flex items-center gap-2 bg-white text-rose-600 font-semibold px-5 py-3 rounded-2xl shadow-lg hover:shadow-xl hover:scale-105 transition-all text-sm"
            >
              <span className="text-lg">+</span> Ajouter
            </button>
          </div>
        </div>

        {/* Onglets */}
        <div className="flex gap-2 mb-6 bg-white dark:bg-slate-800 p-1.5 rounded-2xl border border-gray-100 dark:border-slate-700" role="tablist">
          {Object.entries(TABS).map(([key, t]) => (
            <button key={key} role="tab" aria-selected={tab === key} onClick={() => switchTab(key)}
              className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors ${tab === key
                ? 'bg-gradient-to-r from-rose-500 to-pink-400 text-white shadow'
                : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-700'}`}>
              {t.icon} {t.label}
            </button>
          ))}
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
              <div className="bg-gradient-to-r from-rose-500 to-pink-400 px-6 py-4">
                <h2 className="text-white font-semibold text-lg">
                  {editId ? `✏️ Modifier l'${TABS[form.type].singular}` : `✨ Nouvel${isAllergy ? 'le' : ''} ${TABS[form.type].singular}`}
                </h2>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="sm:col-span-2">
                    <label className={labelClass}>{isAllergy ? 'Allergène *' : 'Pathologie / événement *'}</label>
                    <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                      className={inputClass} placeholder={TABS[form.type].placeholder} maxLength={100} />
                  </div>
                  {isAllergy && (
                    <>
                      <div>
                        <label className={labelClass}>Sévérité</label>
                        <select value={form.severity} onChange={e => setForm(f => ({ ...f, severity: e.target.value }))} className={inputClass}>
                          <option value="">— Non précisée —</option>
                          {Object.entries(SEVERITIES).map(([s, { label }]) => <option key={s} value={s}>{label}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className={labelClass}>Réaction</label>
                        <input value={form.reaction} onChange={e => setForm(f => ({ ...f, reaction: e.target.value }))}
                          className={inputClass} placeholder="ex: Urticaire, œdème..." maxLength={200} />
                      </div>
                    </>
                  )}
                  <div>
                    <label className={labelClass}>Date de diagnostic</label>
                    <input type="date" value={form.diagnosedAt}
                      onChange={e => setForm(f => ({ ...f, diagnosedAt: e.target.value }))} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Traitement</label>
                    <input value={form.treatment} onChange={e => setForm(f => ({ ...f, treatment: e.target.value }))}
                      className={inputClass} placeholder={isAllergy ? 'ex: Antihistaminique, stylo adrénaline' : 'Optionnel'} maxLength={300} />
                  </div>
                  <div className="sm:col-span-2">
                    <label className={labelClass}>Notes</label>
                    <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                      rows={3} maxLength={500} className={`${inputClass} resize-none`} placeholder="Optionnel" />
                  </div>
                  <label className="sm:col-span-2 flex items-center gap-3 text-sm text-gray-600 dark:text-gray-300 cursor-pointer">
                    <input type="checkbox" checked={form.active} onChange={e => setForm(f => ({ ...f, active: e.target.checked }))}
                      className="w-4 h-4 accent-rose-500" />
                    {isAllergy ? 'Allergie toujours active' : 'Toujours en cours / à surveiller'}
                  </label>
                </div>
                {formError && <p className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 px-4 py-2 rounded-xl">{formError}</p>}
                <div className="flex gap-3 pt-2">
                  <button type="submit" disabled={saving}
                    className="flex-1 py-3 bg-gradient-to-r from-rose-500 to-pink-400 disabled:opacity-50 text-white font-semibold rounded-2xl hover:shadow-lg hover:scale-[1.02] transition-all">
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
        {visible.length === 0 && !showForm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="text-center py-20 bg-white dark:bg-slate-800 rounded-3xl border-2 border-dashed border-gray-200 dark:border-slate-700">
            <div className="text-6xl mb-4">{current.icon}</div>
            <p className="text-gray-500 dark:text-gray-400 font-medium mb-6">Aucun{tab === 'allergie' ? 'e' : ''} {current.singular} enregistré{tab === 'allergie' ? 'e' : ''}</p>
            <button onClick={openCreate}
              className="px-6 py-3 bg-gradient-to-r from-rose-500 to-pink-400 text-white font-semibold rounded-2xl hover:shadow-lg transition-all text-sm">
              + Ajouter
            </button>
          </motion.div>
        )}

        {/* Liste */}
        <div className="space-y-3">
          {visible.map((r, i) => (
            <motion.div
              key={r._id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className={`group bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 p-5 flex items-start gap-4 hover:shadow-lg hover:border-rose-200 dark:hover:border-rose-800 transition-all ${r.active ? '' : 'opacity-60'}`}
            >
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-rose-400 to-pink-400 flex items-center justify-center text-xl shadow-md shrink-0">
                {TABS[r.type].icon}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-gray-800 dark:text-gray-100 truncate">{r.name}</p>
                  {r.severity && (
                    <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${SEVERITIES[r.severity].badge}`}>{SEVERITIES[r.severity].label}</span>
                  )}
                  {!r.active && <span className="text-xs px-2.5 py-0.5 rounded-full bg-gray-100 dark:bg-slate-700 text-gray-500">Résolu</span>}
                </div>
                <div className="flex items-center gap-x-4 gap-y-1 mt-1 flex-wrap text-sm text-gray-500 dark:text-gray-400">
                  {r.reaction && <span>⚡ {r.reaction}</span>}
                  {r.diagnosedAt && <span>📅 {new Date(r.diagnosedAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</span>}
                  {r.treatment && <span>💊 {r.treatment}</span>}
                </div>
                {r.notes && <p className="text-xs text-gray-400 dark:text-gray-500 mt-2 whitespace-pre-line">{r.notes}</p>}
              </div>

              <div className="flex gap-2 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity shrink-0">
                <button onClick={() => openEdit(r)} aria-label="Modifier"
                  className="p-2.5 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 rounded-xl hover:bg-rose-100 dark:hover:bg-rose-900/40 transition-colors text-sm font-medium">
                  ✏️
                </button>
                <button onClick={() => setDeleteTarget(r._id)} aria-label="Supprimer"
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
        title="Supprimer"
        message="Supprimer cet élément du dossier médical ?"
        confirmLabel="Supprimer"
        danger
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}
