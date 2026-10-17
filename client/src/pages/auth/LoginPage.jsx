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
    <div className="min-h-screen flex">
      {/* Left side — white with illustration */}
      <div className="hidden lg:flex w-1/2 bg-white items-center justify-center p-12">
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center"
        >
          {/* Illustration placeholder */}
          <div className="relative w-80 h-72 mx-auto">
            {/* Desk */}
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 w-56 h-2 bg-gray-200 rounded-full" />
            {/* Monitor */}
            <div className="absolute bottom-10 left-1/2 -translate-x-1/2 w-32 h-20 bg-blue-100 rounded-lg border-4 border-gray-200 flex flex-col items-center justify-center gap-1 shadow">
              <div className="w-20 h-2 bg-blue-300 rounded" />
              <div className="w-20 h-2 bg-blue-300 rounded" />
              <div className="w-14 h-5 bg-blue-500 rounded mt-1" />
            </div>
            {/* Monitor stand */}
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 w-3 h-4 bg-gray-200" />
            {/* Chart background */}
            <div className="absolute top-4 right-8 w-24 h-28 bg-gray-100 rounded-lg flex flex-col justify-end p-2 gap-1">
              {[60, 40, 80, 50, 70].map((h, i) => (
                <div key={i} className="flex items-end justify-around w-full">
                  <div className="w-3 rounded-t" style={{ height: `${h * 0.3}px`, backgroundColor: i % 2 === 0 ? '#3b82f6' : '#bfdbfe' }} />
                </div>
              ))}
            </div>
            {/* Person */}
            <div className="absolute bottom-10 left-12">
              {/* Head */}
              <div className="w-8 h-8 rounded-full bg-amber-300 mx-auto mb-0.5" />
              {/* Body */}
              <div className="w-10 h-12 bg-blue-500 rounded-t-lg mx-auto relative">
                {/* Arms */}
                <div className="absolute -left-3 top-2 w-3 h-7 bg-blue-500 rounded" />
                <div className="absolute -right-3 top-2 w-3 h-7 bg-blue-500 rounded" />
              </div>
              {/* Legs */}
              <div className="flex justify-center gap-1">
                <div className="w-3 h-8 bg-blue-700 rounded" />
                <div className="w-3 h-8 bg-blue-700 rounded" />
              </div>
            </div>
            {/* Decorative dots */}
            <div className="absolute top-0 left-0 w-3 h-3 rounded-full bg-blue-200" />
            <div className="absolute top-8 left-4 w-2 h-2 rounded-full bg-blue-100" />
            <div className="absolute bottom-0 right-4 w-4 h-4 rounded-full bg-blue-100" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mt-6">PediCare AI</h2>
          <p className="text-gray-400 text-sm mt-2">Votre espace santé pédiatrique intelligent</p>
        </motion.div>
      </div>

      {/* Right side — blue */}
      <div className="w-full lg:w-1/2 bg-blue-500 flex items-center justify-center p-8 relative overflow-hidden">
        {/* Decorative circle bottom right */}
        <div className="absolute -bottom-16 -right-16 w-56 h-56 rounded-full bg-blue-400 opacity-40" />
        <div className="absolute -bottom-8 -right-8 w-32 h-32 rounded-full bg-blue-300 opacity-30" />

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-sm relative z-10"
        >
          {/* Card */}
          <div className="bg-white rounded-2xl shadow-2xl p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-1">Bonjour !</h2>
            <p className="text-gray-500 text-sm mb-6">Connectez-vous pour commencer</p>

            {/* Role selector */}
            <div className="flex rounded-xl overflow-hidden border border-gray-100 mb-6">
              {[
                { value: 'parent', label: '👨‍👩‍👧 Parent' },
                { value: 'pediatre', label: '👨‍⚕️ Pédiatre' }
              ].map(({ value, label }) => (
                <button key={value} type="button" onClick={() => setRole(value)}
                  className={`flex-1 py-2.5 text-sm font-semibold transition-all ${
                    role === value
                      ? 'bg-blue-500 text-white'
                      : 'bg-white text-gray-400 hover:text-gray-600'
                  }`}>
                  {label}
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit} noValidate className="space-y-4">
              {/* Email */}
              <div className="flex items-center gap-3 border border-gray-200 rounded-full px-4 py-3 focus-within:border-blue-400 transition-colors">
                <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <input
                  id="email" type="email" value={email} onChange={e => setEmail(e.target.value)}
                  required placeholder="Adresse email"
                  className="flex-1 text-sm text-gray-700 placeholder-gray-400 outline-none bg-transparent"
                />
              </div>

              {/* Password */}
              <div className="flex items-center gap-3 border border-gray-200 rounded-full px-4 py-3 focus-within:border-blue-400 transition-colors">
                <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <input
                  id="password" type="password" value={password} onChange={e => setPassword(e.target.value)}
                  required placeholder="Mot de passe"
                  className="flex-1 text-sm text-gray-700 placeholder-gray-400 outline-none bg-transparent"
                />
              </div>

              {error && (
                <div role="alert" className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-xs">
                  <span>⚠️</span> {error}
                </div>
              )}

              <button type="submit" disabled={loading}
                className="w-full py-3 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white font-semibold rounded-full transition-all hover:shadow-lg">
                {loading ? 'Connexion...' : 'Se connecter'}
              </button>

              <p className="text-center text-xs text-gray-400">
                Pas encore de compte ?{' '}
                <Link to="/register" className="text-blue-500 hover:text-blue-600 font-semibold">Créer un compte</Link>
              </p>
            </form>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
