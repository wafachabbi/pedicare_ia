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

  const InputField = ({ id, type = 'text', value, onChange, placeholder, icon, error }) => (
    <div>
      <div className={`flex items-center gap-3 border rounded-full px-4 py-3 transition-colors focus-within:border-blue-400 ${error ? 'border-red-400' : 'border-gray-200'}`}>
        {icon}
        <input
          id={id} type={type} value={value} onChange={onChange}
          placeholder={placeholder}
          className="flex-1 text-sm text-gray-700 placeholder-gray-400 outline-none bg-transparent"
        />
      </div>
      {error && <p role="alert" className="mt-1 text-xs text-red-500 pl-2">{error}</p>}
    </div>
  )

  const EmailIcon = <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
  const LockIcon = <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
  const UserIcon = <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
  const PhoneIcon = <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>

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
          <div className="relative w-80 h-72 mx-auto">
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 w-56 h-2 bg-gray-200 rounded-full" />
            <div className="absolute bottom-10 left-1/2 -translate-x-1/2 w-32 h-20 bg-blue-100 rounded-lg border-4 border-gray-200 flex flex-col items-center justify-center gap-1 shadow">
              <div className="w-20 h-2 bg-blue-300 rounded" />
              <div className="w-20 h-2 bg-blue-300 rounded" />
              <div className="w-14 h-5 bg-blue-500 rounded mt-1" />
            </div>
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 w-3 h-4 bg-gray-200" />
            <div className="absolute top-4 right-8 w-24 h-28 bg-gray-100 rounded-lg flex flex-col justify-end p-2 gap-1">
              {[60, 40, 80, 50, 70].map((h, i) => (
                <div key={i} className="flex items-end justify-around w-full">
                  <div className="w-3 rounded-t" style={{ height: `${h * 0.3}px`, backgroundColor: i % 2 === 0 ? '#3b82f6' : '#bfdbfe' }} />
                </div>
              ))}
            </div>
            <div className="absolute bottom-10 left-12">
              <div className="w-8 h-8 rounded-full bg-amber-300 mx-auto mb-0.5" />
              <div className="w-10 h-12 bg-blue-500 rounded-t-lg mx-auto relative">
                <div className="absolute -left-3 top-2 w-3 h-7 bg-blue-500 rounded" />
                <div className="absolute -right-3 top-2 w-3 h-7 bg-blue-500 rounded" />
              </div>
              <div className="flex justify-center gap-1">
                <div className="w-3 h-8 bg-blue-700 rounded" />
                <div className="w-3 h-8 bg-blue-700 rounded" />
              </div>
            </div>
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
        <div className="absolute -bottom-16 -right-16 w-56 h-56 rounded-full bg-blue-400 opacity-40" />
        <div className="absolute -bottom-8 -right-8 w-32 h-32 rounded-full bg-blue-300 opacity-30" />

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-sm relative z-10"
        >
          <div className="bg-white rounded-2xl shadow-2xl p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-1">Bonjour !</h2>
            <p className="text-gray-500 text-sm mb-6">Inscrivez-vous pour commencer</p>

            {/* Role selector */}
            <div className="flex rounded-xl overflow-hidden border border-gray-100 mb-6">
              {[
                { value: 'parent', label: '👨‍👩‍👧 Parent' },
                { value: 'pediatre', label: '👨‍⚕️ Pédiatre' }
              ].map(({ value, label }) => (
                <button key={value} type="button" onClick={() => setRole(value)}
                  className={`flex-1 py-2.5 text-sm font-semibold transition-all ${
                    role === value ? 'bg-blue-500 text-white' : 'bg-white text-gray-400 hover:text-gray-600'
                  }`}>
                  {label}
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit} noValidate className="space-y-3">
              <InputField id="email" type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="Adresse email" icon={EmailIcon} error={errors.email} />

              <AnimatePresence>
                {role === 'pediatre' && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }} className="space-y-3 overflow-hidden">
                    <InputField id="fullName" value={fullName} onChange={e => setFullName(e.target.value)}
                      placeholder="Dr. Prénom Nom" icon={UserIcon} error={errors.fullName} />
                    <InputField id="speciality" value={speciality} onChange={e => setSpeciality(e.target.value)}
                      placeholder="Spécialité" icon={UserIcon} />
                    <InputField id="phone" type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                      placeholder="Téléphone" icon={PhoneIcon} />
                  </motion.div>
                )}
              </AnimatePresence>

              <InputField id="password" type="password" value={password} onChange={e => setPassword(e.target.value)}
                placeholder="Mot de passe" icon={LockIcon} error={errors.password} />

              <InputField id="confirm" type="password" value={confirm} onChange={e => setConfirm(e.target.value)}
                placeholder="Confirmer le mot de passe" icon={LockIcon} error={errors.confirm} />

              {errors.global && (
                <div role="alert" className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-xs">
                  <span>⚠️</span> {errors.global}
                </div>
              )}

              <button type="submit" disabled={loading}
                className="w-full py-3 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white font-semibold rounded-full transition-all hover:shadow-lg mt-2">
                {loading ? 'Création...' : 'Créer mon compte'}
              </button>

              <p className="text-center text-xs text-gray-400">
                Déjà un compte ?{' '}
                <Link to="/login" className="text-blue-500 hover:text-blue-600 font-semibold">Se connecter</Link>
              </p>
            </form>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
