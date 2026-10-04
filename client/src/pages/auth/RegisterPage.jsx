import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../../hooks/useAuth'
import { authService } from '../../services/auth.service'

export default function RegisterPage() {
  const [role, setRole] = useState('parent')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [fullName, setFullName] = useState('')
  const [speciality, setSpeciality] = useState('')
  const [phone, setPhone] = useState('')
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const validate = () => {
    const errs = {}
    if (!email) errs.email = 'Email requis'
    else if (!/^\S+@\S+\.\S+$/.test(email)) errs.email = 'Format email invalide'
    if (!password) errs.password = 'Mot de passe requis'
    else if (password.length < 6) errs.password = 'Au moins 6 caractères'
    if (password !== confirm) errs.confirm = 'Les mots de passe ne correspondent pas'
    if (role === 'pediatre' && !fullName) errs.fullName = 'Nom complet requis'
    return errs
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length > 0) { setErrors(errs); return }
    setErrors({})
    setLoading(true)
    try {
      const data = await authService.register(email, password, role, { fullName, speciality, phone })
      login(data.data.user, data.data.token)
      navigate(data.data.user.role === 'pediatre' ? '/pediatre/dashboard' : '/dashboard')
    } catch (err) {
      setErrors({ global: err.response?.data?.error?.message || "Erreur lors de l'inscription" })
    } finally {
      setLoading(false)
    }
  }

  const inputClass = (hasError) =>
    `w-full px-4 py-3 rounded-2xl border-2 ${hasError ? 'border-red-400' : 'border-gray-100 dark:border-slate-600'} bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:border-mint-400 transition-colors`

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-mint-50 via-white to-sky-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 px-4 py-8">
      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="w-full max-w-md">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-mint-400 to-sky-400 text-3xl shadow-lg shadow-mint-200 dark:shadow-mint-900/30 mb-4">
            🏥
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">PediCare AI</h1>
          <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">Créez votre espace</p>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-xl border border-gray-100 dark:border-slate-700 overflow-hidden">

          {/* Sélecteur rôle */}
          <div className="grid grid-cols-2">
            {[
              { value: 'parent', icon: '👨‍👩‍👧', label: 'Parent' },
              { value: 'pediatre', icon: '👨‍⚕️', label: 'Pédiatre' }
            ].map(({ value, icon, label }) => (
              <button key={value} type="button" onClick={() => setRole(value)}
                className={`flex items-center justify-center gap-2 py-4 text-sm font-semibold transition-all border-b-2 ${
                  role === value
                    ? 'border-mint-500 text-mint-600 dark:text-mint-400 bg-mint-50 dark:bg-mint-900/20'
                    : 'border-gray-100 dark:border-slate-700 text-gray-400 hover:text-gray-600 bg-white dark:bg-slate-800'
                }`}>
                <span className="text-lg">{icon}</span> {label}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="p-8 space-y-4" noValidate>

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Email</label>
              <input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)}
                aria-invalid={!!errors.email} className={inputClass(errors.email)} placeholder="exemple@email.com" />
              {errors.email && <p role="alert" className="mt-1 text-xs text-red-500">{errors.email}</p>}
            </div>

            {/* Champs pédiatre */}
            <AnimatePresence>
              {role === 'pediatre' && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }} className="space-y-4 overflow-hidden">
                  <div>
                    <label htmlFor="fullName" className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Nom complet *</label>
                    <input id="fullName" type="text" value={fullName} onChange={e => setFullName(e.target.value)}
                      aria-invalid={!!errors.fullName} className={inputClass(errors.fullName)} placeholder="Dr. Prénom Nom" />
                    {errors.fullName && <p role="alert" className="mt-1 text-xs text-red-500">{errors.fullName}</p>}
                  </div>
                  <div>
                    <label htmlFor="speciality" className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Spécialité</label>
                    <input id="speciality" type="text" value={speciality} onChange={e => setSpeciality(e.target.value)}
                      className={inputClass(false)} placeholder="Pédiatrie générale" />
                  </div>
                  <div>
                    <label htmlFor="phone" className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Téléphone</label>
                    <input id="phone" type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                      className={inputClass(false)} placeholder="+216 xx xxx xxx" />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Mot de passe</label>
              <input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)}
                aria-invalid={!!errors.password} className={inputClass(errors.password)} placeholder="••••••••" />
              {errors.password && <p role="alert" className="mt-1 text-xs text-red-500">{errors.password}</p>}
            </div>

            {/* Confirm */}
            <div>
              <label htmlFor="confirm" className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Confirmer le mot de passe</label>
              <input id="confirm" type="password" value={confirm} onChange={e => setConfirm(e.target.value)}
                aria-invalid={!!errors.confirm} className={inputClass(errors.confirm)} placeholder="••••••••" />
              {errors.confirm && <p role="alert" className="mt-1 text-xs text-red-500">{errors.confirm}</p>}
            </div>

            {errors.global && (
              <div role="alert" className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl text-red-600 dark:text-red-400 text-sm">
                <span>⚠️</span> {errors.global}
              </div>
            )}

            <button type="submit" disabled={loading}
              className="w-full py-3.5 bg-gradient-to-r from-mint-500 to-sky-400 disabled:opacity-50 text-white font-semibold rounded-2xl hover:shadow-lg hover:scale-[1.02] transition-all focus:outline-none focus:ring-2 focus:ring-mint-400 mt-2">
              {loading ? 'Création...' : 'Créer mon compte →'}
            </button>

            <p className="text-center text-sm text-gray-400 dark:text-gray-500">
              Déjà un compte ?{' '}
              <Link to="/login" className="text-mint-500 hover:text-mint-400 font-semibold">Se connecter</Link>
            </p>
          </form>
        </div>
      </motion.div>
    </div>
  )
}
