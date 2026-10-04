import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '../../hooks/useAuth'
import { authService } from '../../services/auth.service'

export default function LoginPage() {
  const [role, setRole] = useState('parent')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const data = await authService.login(email, password)
      const user = data.data.user
      if (user.role !== role) {
        setError(`Ce compte est un compte ${user.role === 'pediatre' ? 'pédiatre' : 'parent'}, pas ${role === 'pediatre' ? 'pédiatre' : 'parent'}`)
        setLoading(false)
        return
      }
      login(user, data.data.token)
      navigate(user.role === 'pediatre' ? '/pediatre/dashboard' : '/dashboard')
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Identifiants invalides')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-mint-50 via-white to-sky-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 px-4">
      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="w-full max-w-md">

        {/* Logo / Hero */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-mint-400 to-sky-400 text-3xl shadow-lg shadow-mint-200 dark:shadow-mint-900/30 mb-4">
            🏥
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">PediCare AI</h1>
          <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">Connectez-vous à votre espace</p>
        </div>

        {/* Card */}
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

          {/* Formulaire */}
          <form onSubmit={handleSubmit} className="p-8 space-y-5" noValidate>
            <div>
              <label htmlFor="email" className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                Adresse email
              </label>
              <input
                id="email" type="email" value={email} onChange={e => setEmail(e.target.value)}
                required aria-required="true" aria-describedby={error ? 'auth-error' : undefined}
                className="w-full px-4 py-3 rounded-2xl border-2 border-gray-100 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:border-mint-400 transition-colors"
                placeholder="exemple@email.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                Mot de passe
              </label>
              <input
                id="password" type="password" value={password} onChange={e => setPassword(e.target.value)}
                required aria-required="true"
                className="w-full px-4 py-3 rounded-2xl border-2 border-gray-100 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:border-mint-400 transition-colors"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div id="auth-error" role="alert" className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl text-red-600 dark:text-red-400 text-sm">
                <span>⚠️</span> {error}
              </div>
            )}

            <button type="submit" disabled={loading}
              className="w-full py-3.5 bg-gradient-to-r from-mint-500 to-sky-400 disabled:opacity-50 text-white font-semibold rounded-2xl hover:shadow-lg hover:scale-[1.02] transition-all focus:outline-none focus:ring-2 focus:ring-mint-400">
              {loading ? 'Connexion...' : 'Se connecter →'}
            </button>

            <p className="text-center text-sm text-gray-400 dark:text-gray-500">
              Pas encore de compte ?{' '}
              <Link to="/register" className="text-mint-500 hover:text-mint-400 font-semibold">Créer un compte</Link>
            </p>
          </form>
        </div>
      </motion.div>
    </div>
  )
}
