import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useAuth } from '../../hooks/useAuth'
import api from '../../services/api'
import GlassCard from '../../components/ui/GlassCard'
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

  return (
    <div className="max-w-lg mx-auto">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-6">👨‍⚕️ Mon profil</h1>

        <GlassCard className="p-6">
          {/* Email (non modifiable) */}
          <div className="mb-6 p-4 bg-gray-50 dark:bg-slate-800 rounded-xl">
            <p className="text-xs text-gray-400 mb-1">Adresse email</p>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{user?.email}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nom complet</label>
              <input id="fullName" type="text" value={form.fullName}
                onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-sky-400 transition"
                placeholder="Dr. Prénom Nom" />
            </div>

            <div>
              <label htmlFor="speciality" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Spécialité</label>
              <input id="speciality" type="text" value={form.speciality}
                onChange={e => setForm(f => ({ ...f, speciality: e.target.value }))}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-sky-400 transition"
                placeholder="Pédiatrie générale" />
            </div>

            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Téléphone</label>
              <input id="phone" type="tel" value={form.phone}
                onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-sky-400 transition"
                placeholder="+216 xx xxx xxx" />
            </div>

            {error && <p role="alert" className="text-sm text-red-500">{error}</p>}
            {saved && <p role="status" className="text-sm text-mint-500">✅ Profil mis à jour avec succès</p>}

            <button type="submit" disabled={loading}
              className="w-full py-3 bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-white font-semibold rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-sky-400">
              {loading ? <LoadingSpinner size="sm" color="sky" /> : 'Enregistrer'}
            </button>
          </form>
        </GlassCard>
      </motion.div>
    </div>
  )
}
