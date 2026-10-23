import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useAuth } from '../../hooks/useAuth'
import api from '../../services/api'
import LoadingSpinner from '../../components/ui/LoadingSpinner'

export default function PediatreProfilePage() {
  const { user, login, token } = useAuth()
  const [form, setForm] = useState({ fullName: '', speciality: '', phone: '' })
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    api.get('/pediatre/profile').then(res => {
      const u = res.data.data
      setForm({ fullName: u.fullName || '', speciality: u.speciality || '', phone: u.phone || '' })
    }).catch(() => {})
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSaved(false)
    try {
      const res = await api.put('/pediatre/profile', form)
      login(res.data.data, token)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Erreur lors de la mise à jour')
    } finally {
      setLoading(false)
    }
  }

  const inputClass = `w-full px-4 py-3 rounded-2xl border-2 border-gray-100 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:border-sky-400 transition-colors`

  return (
    <div className="max-w-lg mx-auto p-2">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>

        {/* Header */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-sky-500 to-violet-500 p-7 mb-6 shadow-xl shadow-sky-200 dark:shadow-sky-900/30">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/4" />
          <div className="relative flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-2xl">
              👨‍⚕️
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Mon profil</h1>
              <p className="text-sky-100 text-sm">{user?.email}</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-xl border border-gray-100 dark:border-slate-700 overflow-hidden">
          <div className="bg-gradient-to-r from-sky-500 to-violet-500 px-6 py-4">
            <h2 className="text-white font-semibold">Informations professionnelles</h2>
          </div>
          <form onSubmit={handleSubmit} className="p-6 space-y-5">

            <div>
              <label htmlFor="fullName" className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Nom complet</label>
              <input id="fullName" type="text" value={form.fullName}
                onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))}
                className={inputClass} placeholder="Dr. Prénom Nom" />
            </div>

            <div>
              <label htmlFor="speciality" className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Spécialité</label>
              <input id="speciality" type="text" value={form.speciality}
                onChange={e => setForm(f => ({ ...f, speciality: e.target.value }))}
                className={inputClass} placeholder="Pédiatrie générale" />
            </div>

            <div>
              <label htmlFor="phone" className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Téléphone</label>
              <input id="phone" type="tel" value={form.phone}
                onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                className={inputClass} placeholder="+216 xx xxx xxx" />
            </div>

            {error && (
              <div role="alert" className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl text-red-600 dark:text-red-400 text-sm">
                <span>⚠️</span> {error}
              </div>
            )}
            {saved && (
              <div role="status" className="flex items-center gap-2 p-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-2xl text-emerald-600 dark:text-emerald-400 text-sm">
                <span>✅</span> Profil mis à jour avec succès
              </div>
            )}

            <button type="submit" disabled={loading}
              className="w-full py-3.5 bg-gradient-to-r from-sky-500 to-violet-500 disabled:opacity-50 text-white font-semibold rounded-2xl hover:shadow-lg hover:scale-[1.02] transition-all focus:outline-none focus:ring-2 focus:ring-sky-400">
              {loading ? <LoadingSpinner size="sm" color="sky" /> : 'Enregistrer les modifications'}
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  )
}
