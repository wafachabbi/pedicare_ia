import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '../../hooks/useAuth'
import { authService } from '../../services/auth.service'

export default function RegisterPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
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
    return errs
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length > 0) { setErrors(errs); return }
    setErrors({})
    setLoading(true)
    try {
      const data = await authService.register(email, password)
      login(data.data.user, data.data.token)
      navigate('/dashboard')
    } catch (err) {
      setErrors({ global: err.response?.data?.error?.message || "Erreur lors de l'inscription" })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-mint-50 via-white to-sky-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 px-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        <div className="glass-card p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-mint-500">🏥 PediCare AI</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-2">Créez votre compte parent</p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Adresse email</label>
              <input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)}
                aria-invalid={!!errors.email} aria-describedby={errors.email ? 'email-error' : undefined}
                className={`w-full px-4 py-2.5 rounded-xl border ${errors.email ? 'border-red-400' : 'border-gray-200 dark:border-slate-600'} bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-mint-400 transition`}
                placeholder="parent@exemple.com" />
              {errors.email && <p id="email-error" role="alert" className="mt-1 text-xs text-red-500">{errors.email}</p>}
            </div>
            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Mot de passe</label>
              <input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)}
                aria-invalid={!!errors.password} aria-describedby={errors.password ? 'password-error' : undefined}
                className={`w-full px-4 py-2.5 rounded-xl border ${errors.password ? 'border-red-400' : 'border-gray-200 dark:border-slate-600'} bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-mint-400 transition`}
                placeholder="••••••••" />
              {errors.password && <p id="password-error" role="alert" className="mt-1 text-xs text-red-500">{errors.password}</p>}
            </div>
            {/* Confirm */}
            <div>
              <label htmlFor="confirm" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Confirmer le mot de passe</label>
              <input id="confirm" type="password" value={confirm} onChange={e => setConfirm(e.target.value)}
                aria-invalid={!!errors.confirm} aria-describedby={errors.confirm ? 'confirm-error' : undefined}
                className={`w-full px-4 py-2.5 rounded-xl border ${errors.confirm ? 'border-red-400' : 'border-gray-200 dark:border-slate-600'} bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-mint-400 transition`}
                placeholder="••••••••" />
              {errors.confirm && <p id="confirm-error" role="alert" className="mt-1 text-xs text-red-500">{errors.confirm}</p>}
            </div>
            {errors.global && <p role="alert" className="text-sm text-red-500">{errors.global}</p>}
            <button type="submit" disabled={loading}
              className="w-full py-3 px-4 bg-mint-500 hover:bg-mint-400 disabled:opacity-50 text-white font-semibold rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-mint-400">
              {loading ? 'Création...' : 'Créer mon compte'}
            </button>
          </form>
          <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-6">
            Déjà un compte ?{' '}
            <Link to="/login" className="text-mint-500 hover:text-mint-400 font-medium">Se connecter</Link>
          </p>
        </div>
      </motion.div>
    </div>
  )
}
