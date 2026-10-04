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
      // Vérifier que le rôle correspond
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
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="glass-card p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-mint-500">🏥 PediCare AI</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-2">Connectez-vous à votre compte</p>
          </div>

          {/* Sélection du rôle */}
          <div className="flex gap-3 mb-6">
            {[
              { value: 'parent', icon: '👨‍👩‍👧', label: 'Parent' },
              { value: 'pediatre', icon: '👨‍⚕️', label: 'Pédiatre' }
            ].map(({ value, icon, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => setRole(value)}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border-2 text-sm font-medium transition-all ${
                  role === value
                    ? 'border-mint-500 bg-mint-50 dark:bg-mint-900/20 text-mint-700 dark:text-mint-400'
                    : 'border-gray-200 dark:border-slate-600 text-gray-500 hover:border-gray-300'
                }`}
              >
                <span>{icon}</span> {label}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Adresse email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                aria-required="true"
                aria-describedby={error ? 'auth-error' : undefined}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-mint-400 transition"
                placeholder="parent@exemple.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Mot de passe
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                aria-required="true"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-mint-400 transition"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <p id="auth-error" role="alert" className="text-sm text-red-500 dark:text-red-400">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-mint-500 hover:bg-mint-400 disabled:opacity-50 text-white font-semibold rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-mint-400"
            >
              {loading ? 'Connexion...' : 'Se connecter'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-6">
            Pas encore de compte ?{' '}
            <Link to="/register" className="text-mint-500 hover:text-mint-400 font-medium">
              Créer un compte
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  )
}
