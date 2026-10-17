import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { childrenService } from '../../services/children.service'
import { useChild } from '../../hooks/useChild'
import ConfirmModal from '../../components/ui/ConfirmModal'
import LoadingSpinner from '../../components/ui/LoadingSpinner'

const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Inconnu']

export default function ChildFormPage() {
  const { id } = useParams()
  const isEdit = !!id
  const navigate = useNavigate()
  const { fetchChildren } = useChild()

  const [form, setForm] = useState({ firstName: '', dateOfBirth: '', gender: 'M', bloodType: 'Inconnu', allergies: '' })
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [fetchLoading, setFetchLoading] = useState(isEdit)
  const [showDeleteModal, setShowDeleteModal] = useState(false)

  useEffect(() => {
    if (!isEdit) return
    childrenService.getOne(id)
      .then(data => {
        const c = data.data
        setForm({ firstName: c.firstName, dateOfBirth: c.dateOfBirth?.split('T')[0] || '', gender: c.gender, bloodType: c.bloodType || 'Inconnu', allergies: c.allergies || '' })
      })
      .catch(() => navigate('/children'))
      .finally(() => setFetchLoading(false))
  }, [id, isEdit, navigate])

  const validate = () => {
    const errs = {}
    if (!form.firstName.trim()) errs.firstName = 'Prénom requis'
    if (!form.dateOfBirth) errs.dateOfBirth = 'Date de naissance requise'
    else if (new Date(form.dateOfBirth) > new Date()) errs.dateOfBirth = 'La date ne peut pas être dans le futur'
    return errs
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length > 0) { setErrors(errs); return }
    setErrors({})
    setLoading(true)
    try {
      if (isEdit) await childrenService.update(id, form)
      else await childrenService.create(form)
      await fetchChildren()
      navigate('/dashboard')
    } catch (err) {
      setErrors({ global: err.response?.data?.error?.message || 'Une erreur est survenue' })
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    setLoading(true)
    try {
      await childrenService.remove(id)
      await fetchChildren()
      navigate('/dashboard')
    } catch {
      setErrors({ global: 'Erreur lors de la suppression' })
    } finally {
      setLoading(false)
      setShowDeleteModal(false)
    }
  }

  if (fetchLoading) return <div className="flex justify-center h-64 items-center"><LoadingSpinner size="lg" /></div>

  const inputClass = (hasError) =>
    `w-full px-4 py-3 rounded-2xl border-2 ${hasError ? 'border-red-400' : 'border-gray-100 dark:border-slate-600'} bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:border-mint-400 transition-colors`

  return (
    <div className="max-w-lg mx-auto p-2">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>

        {/* Header */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-mint-500 to-sky-400 p-7 mb-6 shadow-xl shadow-mint-200 dark:shadow-mint-900/30">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/4" />
          <div className="relative flex items-center gap-4">
            <button onClick={() => navigate(-1)}
              className="w-10 h-10 rounded-xl bg-white/20 hover:bg-white/30 transition-colors flex items-center justify-center text-white shrink-0">
              ←
            </button>
            <div>
              <h1 className="text-xl font-bold text-white">
                {isEdit ? '✏️ Modifier le profil' : '👶 Ajouter un enfant'}
              </h1>
              <p className="text-white/70 text-sm mt-0.5">
                {isEdit ? `Modification de ${form.firstName || '...'}` : 'Nouveau profil enfant'}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-xl border border-gray-100 dark:border-slate-700 overflow-hidden">
          <div className="bg-gradient-to-r from-mint-500 to-sky-400 px-6 py-4">
            <h2 className="text-white font-semibold">Informations de l'enfant</h2>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-5" noValidate>

            {/* Prénom */}
            <div>
              <label htmlFor="firstName" className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Prénom *</label>
              <input id="firstName" type="text" value={form.firstName}
                onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))}
                aria-invalid={!!errors.firstName} className={inputClass(errors.firstName)}
                placeholder="Prénom de l'enfant" />
              {errors.firstName && <p id="firstName-error" role="alert" className="mt-1 text-xs text-red-500">{errors.firstName}</p>}
            </div>

            {/* Date de naissance */}
            <div>
              <label htmlFor="dateOfBirth" className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Date de naissance *</label>
              <input id="dateOfBirth" type="date" value={form.dateOfBirth}
                onChange={e => setForm(f => ({ ...f, dateOfBirth: e.target.value }))}
                max={new Date().toISOString().split('T')[0]}
                aria-invalid={!!errors.dateOfBirth} className={inputClass(errors.dateOfBirth)} />
              {errors.dateOfBirth && <p role="alert" className="mt-1 text-xs text-red-500">{errors.dateOfBirth}</p>}
            </div>

            {/* Genre */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">Genre *</label>
              <div className="flex gap-3">
                {[{ value: 'M', label: '👦 Garçon' }, { value: 'F', label: '👧 Fille' }, { value: 'other', label: '🧒 Autre' }].map(({ value, label }) => (
                  <button key={value} type="button" onClick={() => setForm(f => ({ ...f, gender: value }))}
                    className={`flex-1 py-3 rounded-2xl border-2 text-sm font-medium transition-all ${
                      form.gender === value
                        ? 'border-mint-500 bg-mint-50 dark:bg-mint-900/20 text-mint-700 dark:text-mint-400'
                        : 'border-gray-100 dark:border-slate-600 text-gray-500 hover:border-gray-200 bg-gray-50 dark:bg-slate-700'
                    }`}>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Groupe sanguin */}
            <div>
              <label htmlFor="bloodType" className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Groupe sanguin</label>
              <select id="bloodType" value={form.bloodType}
                onChange={e => setForm(f => ({ ...f, bloodType: e.target.value }))}
                className={inputClass(false)}>
                {BLOOD_TYPES.map(bt => <option key={bt} value={bt}>{bt}</option>)}
              </select>
            </div>

            {/* Allergies */}
            <div>
              <label htmlFor="allergies" className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Allergies / Antécédents</label>
              <textarea id="allergies" value={form.allergies}
                onChange={e => setForm(f => ({ ...f, allergies: e.target.value }))}
                rows={3} maxLength={500}
                className={`${inputClass(false)} resize-none`}
                placeholder="Ex: allergie aux arachides, asthme..." />
              <p className="text-xs text-gray-400 text-right mt-1">{form.allergies.length}/500</p>
            </div>

            {errors.global && (
              <div role="alert" className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl text-red-600 dark:text-red-400 text-sm">
                <span>⚠️</span> {errors.global}
              </div>
            )}

            <div className="flex flex-col gap-3 pt-2">
              <button type="submit" disabled={loading}
                className="w-full py-3.5 bg-gradient-to-r from-mint-500 to-sky-400 disabled:opacity-50 text-white font-semibold rounded-2xl hover:shadow-lg hover:scale-[1.02] transition-all focus:outline-none focus:ring-2 focus:ring-mint-400">
                {loading ? <LoadingSpinner size="sm" color="mint" /> : isEdit ? 'Enregistrer les modifications' : 'Créer le profil →'}
              </button>

              {isEdit && (
                <button type="button" onClick={() => setShowDeleteModal(true)}
                  className="w-full py-3 border-2 border-red-200 dark:border-red-800 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 font-medium rounded-2xl transition-colors">
                  🗑️ Supprimer ce profil
                </button>
              )}
            </div>
          </form>
        </div>
      </motion.div>

      <ConfirmModal
        isOpen={showDeleteModal}
        title="Supprimer le profil"
        message={`Êtes-vous sûr de vouloir supprimer le profil de ${form.firstName} ? Toutes les données associées seront définitivement supprimées.`}
        confirmLabel="Supprimer"
        danger
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteModal(false)}
      />
    </div>
  )
}
