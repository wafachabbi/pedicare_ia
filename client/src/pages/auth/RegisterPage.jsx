import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../../hooks/useAuth'
import { authService } from '../../services/auth.service'
import loginHero from '../../assets/login-hero.png'
import logoPediatrique from '../../assets/logo-pediatrique.png'

export default function RegisterPage() {
  const [role, setRole]             = useState('parent')
  const [email, setEmail]           = useState('')
  const [password, setPassword]     = useState('')
  const [confirm, setConfirm]       = useState('')
  const [fullName, setFullName]     = useState('')
  const [speciality, setSpeciality] = useState('')
  const [phone, setPhone]           = useState('')
  const [showPwd, setShowPwd]       = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [errors, setErrors]         = useState({})
  const [loading, setLoading]       = useState(false)
  const { login } = useAuth()
  const navigate  = useNavigate()

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

  // Icône œil — afficher/masquer mot de passe
  const EyeOff = (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
    </svg>
  )
  const EyeOn = (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  )

  return (
    <div className="h-screen flex bg-white overflow-hidden items-stretch">

      {/* ── Côté gauche — même image hero que le Login ───────────────────── */}
      <div className="hidden lg:block w-1/2 relative overflow-hidden">
        <img
          src={loginHero}
          alt="PediCare AI — pédiatre et enfant"
          className="w-full h-full object-cover object-top"
          style={{ objectPosition: 'center 10%' }}
        />
        <div className="absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-[#4B8EF1]/90 to-transparent" />
      </div>

      {/* ── Côté droit — fond bleu identique au Login ────────────────────── */}
      <div
        className="w-full lg:w-1/2 flex items-center justify-center px-8 relative overflow-hidden"
        style={{ background: 'linear-gradient(160deg, #5B9BF5 0%, #4B8EF1 40%, #3B7DE8 100%)' }}
      >
        {/* Cercles déco */}
        <div className="absolute -bottom-20 -right-20 w-72 h-72 rounded-full bg-blue-400/30" />
        <div className="absolute -bottom-8 -right-8 w-40 h-40 rounded-full bg-blue-300/20" />
        <div className="absolute top-8 left-8 w-20 h-20 rounded-full bg-white/5" />
        <div className="absolute top-4 right-12">
          <p className="text-white font-bold text-xl italic" style={{ fontFamily: 'cursive' }}>Bienvenue !</p>
          <svg className="w-16 h-4 ml-4" viewBox="0 0 60 12" fill="none">
            <path d="M0 6 Q30 0 60 6" stroke="white" strokeWidth="1.5" fill="none" opacity="0.6" />
          </svg>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-sm relative z-10"
        >
          {/* Carte formulaire */}
          <div className="bg-white rounded-3xl shadow-2xl p-6">

            {/* Logo — identique au Login */}
            <div className="flex items-center gap-3 mb-4">
              <img src={logoPediatrique} alt="PediCare AI" className="w-10 h-10 object-contain" />
              <div>
                <p className="font-bold text-gray-900 text-base leading-tight">PediCare AI</p>
                <p className="text-gray-400 text-xs">Créez votre espace santé pédiatrique</p>
              </div>
            </div>

            {/* Sélecteur de rôle */}
            <div className="flex rounded-2xl overflow-hidden border-2 border-gray-100 mb-4">
              {[
                { value: 'parent',   label: 'Parent',   icon: '👨‍👩‍👧' },
                { value: 'pediatre', label: 'Pédiatre', icon: '🩺' }
              ].map(({ value, label, icon }) => (
                <button key={value} type="button" onClick={() => setRole(value)}
                  className={`flex-1 py-3 text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
                    role === value
                      ? 'bg-blue-600 text-white shadow-inner'
                      : 'bg-white text-gray-400 hover:text-gray-600'
                  }`}>
                  <span>{icon}</span> {label}
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit} noValidate className="space-y-3">

              {/* Champs spécifiques au pédiatre */}
              <AnimatePresence>
                {role === 'pediatre' && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-3 overflow-hidden"
                  >
                    {/* Nom complet */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 mb-1.5 ml-1">Nom complet *</label>
                      <div className={`flex items-center gap-3 border-2 rounded-2xl px-4 py-3 focus-within:border-blue-400 transition-colors bg-gray-50 ${errors.fullName ? 'border-red-300' : 'border-gray-100'}`}>
                        <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        <input type="text" value={fullName} onChange={e => setFullName(e.target.value)}
                          placeholder="Dr. Prénom Nom"
                          className="flex-1 text-sm text-gray-700 placeholder-gray-300 outline-none bg-transparent" />
                      </div>
                      {errors.fullName && <p role="alert" className="mt-1 text-xs text-red-500 pl-2">{errors.fullName}</p>}
                    </div>

                    {/* Spécialité */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 mb-1.5 ml-1">Spécialité</label>
                      <div className="flex items-center gap-3 border-2 border-gray-100 rounded-2xl px-4 py-3 focus-within:border-blue-400 transition-colors bg-gray-50">
                        <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                        <input type="text" value={speciality} onChange={e => setSpeciality(e.target.value)}
                          placeholder="ex : Pédiatrie générale"
                          className="flex-1 text-sm text-gray-700 placeholder-gray-300 outline-none bg-transparent" />
                      </div>
                    </div>

                    {/* Téléphone */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 mb-1.5 ml-1">Téléphone</label>
                      <div className="flex items-center gap-3 border-2 border-gray-100 rounded-2xl px-4 py-3 focus-within:border-blue-400 transition-colors bg-gray-50">
                        <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                        <input type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                          placeholder="+213 XX XX XX XX"
                          className="flex-1 text-sm text-gray-700 placeholder-gray-300 outline-none bg-transparent" />
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Email */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5 ml-1">Adresse e-mail</label>
                <div className={`flex items-center gap-3 border-2 rounded-2xl px-4 py-3 focus-within:border-blue-400 transition-colors bg-gray-50 ${errors.email ? 'border-red-300' : 'border-gray-100'}`}>
                  <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)}
                    required placeholder="exemple@email.com"
                    className="flex-1 text-sm text-gray-700 placeholder-gray-300 outline-none bg-transparent" />
                </div>
                {errors.email && <p role="alert" className="mt-1 text-xs text-red-500 pl-2">{errors.email}</p>}
              </div>

              {/* Mot de passe */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5 ml-1">Mot de passe</label>
                <div className={`flex items-center gap-3 border-2 rounded-2xl px-4 py-3 focus-within:border-blue-400 transition-colors bg-gray-50 ${errors.password ? 'border-red-300' : 'border-gray-100'}`}>
                  <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  <input id="password" type={showPwd ? 'text' : 'password'} value={password}
                    onChange={e => setPassword(e.target.value)} required placeholder="••••••••"
                    className="flex-1 text-sm text-gray-700 placeholder-gray-300 outline-none bg-transparent" />
                  <button type="button" onClick={() => setShowPwd(s => !s)}
                    className="text-gray-400 hover:text-blue-500 transition-colors">
                    {showPwd ? EyeOff : EyeOn}
                  </button>
                </div>
                {errors.password && <p role="alert" className="mt-1 text-xs text-red-500 pl-2">{errors.password}</p>}
              </div>

              {/* Confirmer mot de passe */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5 ml-1">Confirmer le mot de passe</label>
                <div className={`flex items-center gap-3 border-2 rounded-2xl px-4 py-3 focus-within:border-blue-400 transition-colors bg-gray-50 ${errors.confirm ? 'border-red-300' : 'border-gray-100'}`}>
                  <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  <input id="confirm" type={showConfirm ? 'text' : 'password'} value={confirm}
                    onChange={e => setConfirm(e.target.value)} required placeholder="••••••••"
                    className="flex-1 text-sm text-gray-700 placeholder-gray-300 outline-none bg-transparent" />
                  <button type="button" onClick={() => setShowConfirm(s => !s)}
                    className="text-gray-400 hover:text-blue-500 transition-colors">
                    {showConfirm ? EyeOff : EyeOn}
                  </button>
                </div>
                {errors.confirm && <p role="alert" className="mt-1 text-xs text-red-500 pl-2">{errors.confirm}</p>}
              </div>

              {/* Erreur globale */}
              {errors.global && (
                <div role="alert" className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-xs">
                  <span>⚠️</span> {errors.global}
                </div>
              )}

              {/* Bouton créer le compte */}
              <button type="submit" disabled={loading}
                className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-2xl transition-all hover:shadow-lg flex items-center justify-center gap-2 text-sm mt-2">
                {loading ? 'Création en cours...' : <>Créer mon compte <span>→</span></>}
              </button>

              {/* Séparateur */}
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-gray-100" />
                <span className="text-xs text-gray-400">Ou s'inscrire avec</span>
                <div className="flex-1 h-px bg-gray-100" />
              </div>

              {/* Boutons sociaux décoratifs — identiques au Login */}
              <div className="grid grid-cols-2 gap-3">
                <button type="button"
                  className="flex items-center justify-center gap-2 py-2.5 border-2 border-gray-100 rounded-2xl text-xs font-semibold text-gray-600 hover:border-gray-200 hover:bg-gray-50 transition-all">
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Google
                </button>
                <button type="button"
                  className="flex items-center justify-center gap-2 py-2.5 border-2 border-gray-100 rounded-2xl text-xs font-semibold text-gray-600 hover:border-gray-200 hover:bg-gray-50 transition-all">
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path fill="#F25022" d="M1 1h10v10H1z"/>
                    <path fill="#00A4EF" d="M13 1h10v10H13z"/>
                    <path fill="#7FBA00" d="M1 13h10v10H1z"/>
                    <path fill="#FFB900" d="M13 13h10v10H13z"/>
                  </svg>
                  Microsoft
                </button>
              </div>

              {/* Sécurité + lien connexion */}
              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-1.5 text-xs text-gray-400">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  Vos données de santé sont protégées
                </div>
                <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>

              <p className="text-center text-xs text-gray-400 pt-1">
                Déjà un compte ?{' '}
                <Link to="/login" className="text-blue-600 hover:text-blue-700 font-bold">Se connecter</Link>
              </p>
            </form>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
