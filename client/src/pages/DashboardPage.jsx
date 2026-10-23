import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '../hooks/useAuth'
import { useChild } from '../hooks/useChild'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import AdsCarousel from '../components/ui/AdsCarousel'

function computeAge(dateOfBirth) {
  const now = new Date()
  const dob = new Date(dateOfBirth)
  const months = (now.getFullYear() - dob.getFullYear()) * 12 + (now.getMonth() - dob.getMonth())
  if (months < 24) return `${months} mois`
  return `${Math.floor(months / 12)} ans`
}

const services = [
  {
    label: 'Croissance',
    path: '/growth',
    desc: 'Suivez la courbe de croissance, le poids et la taille de votre enfant.',
    icon: (
      <svg viewBox="0 0 64 64" className="w-16 h-16 mx-auto" fill="none">
        <rect x="8" y="32" width="10" height="24" rx="3" fill="#bfdbfe"/>
        <rect x="22" y="20" width="10" height="36" rx="3" fill="#93c5fd"/>
        <rect x="36" y="10" width="10" height="46" rx="3" fill="#60a5fa"/>
        <rect x="50" y="4"  width="10" height="52" rx="3" fill="#3b82f6"/>
        <path d="M10 36 L26 22 L42 14 L58 8" stroke="#1d4ed8" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
      </svg>
    ),
  },
  {
    label: 'Vaccination',
    path: '/vaccination',
    desc: "Carnet vaccinal numérique avec rappels automatiques des prochaines doses.",
    icon: (
      <svg viewBox="0 0 64 64" className="w-16 h-16 mx-auto" fill="none">
        <rect x="28" y="6" width="8" height="36" rx="4" fill="#bfdbfe"/>
        <rect x="24" y="38" width="16" height="14" rx="3" fill="#93c5fd"/>
        <circle cx="32" cy="52" r="4" fill="#3b82f6"/>
        <rect x="20" y="14" width="24" height="4" rx="2" fill="#60a5fa"/>
        <path d="M18 8 L14 4 M46 8 L50 4" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    label: 'Agenda',
    path: '/agenda',
    desc: 'Gérez les rendez-vous médicaux et recevez des rappels avant chaque consultation.',
    icon: (
      <svg viewBox="0 0 64 64" className="w-16 h-16 mx-auto" fill="none">
        <rect x="8" y="14" width="48" height="42" rx="6" fill="#bfdbfe"/>
        <rect x="8" y="14" width="48" height="14" rx="6" fill="#3b82f6"/>
        <rect x="20" y="6" width="6" height="14" rx="3" fill="#1d4ed8"/>
        <rect x="38" y="6" width="6" height="14" rx="3" fill="#1d4ed8"/>
        <rect x="16" y="36" width="8" height="8" rx="2" fill="#60a5fa"/>
        <rect x="28" y="36" width="8" height="8" rx="2" fill="#60a5fa"/>
        <rect x="40" y="36" width="8" height="8" rx="2" fill="#60a5fa"/>
      </svg>
    ),
  },
  {
    label: 'Journal',
    path: '/journal',
    desc: 'Notez les observations quotidiennes, humeur, sommeil et alimentation.',
    icon: (
      <svg viewBox="0 0 64 64" className="w-16 h-16 mx-auto" fill="none">
        <rect x="12" y="6" width="40" height="52" rx="6" fill="#bfdbfe"/>
        <rect x="12" y="6" width="8" height="52" rx="4" fill="#93c5fd"/>
        <rect x="24" y="18" width="22" height="3" rx="1.5" fill="#3b82f6"/>
        <rect x="24" y="26" width="18" height="3" rx="1.5" fill="#3b82f6"/>
        <rect x="24" y="34" width="20" height="3" rx="1.5" fill="#3b82f6"/>
        <rect x="24" y="42" width="14" height="3" rx="1.5" fill="#93c5fd"/>
      </svg>
    ),
  },
  {
    label: 'Consultation',
    path: '/consultation',
    desc: 'Mode consultation pour partager les informations avec votre pédiatre.',
    icon: (
      <svg viewBox="0 0 64 64" className="w-16 h-16 mx-auto" fill="none">
        <circle cx="32" cy="20" r="14" fill="#bfdbfe"/>
        <circle cx="32" cy="20" r="8"  fill="#93c5fd"/>
        <path d="M18 50 Q18 36 32 36 Q46 36 46 50" fill="#3b82f6"/>
        <circle cx="48" cy="46" r="8" fill="#1d4ed8"/>
        <path d="M44 46 L47 49 L52 43" stroke="white" strokeWidth="2" strokeLinecap="round" fill="none"/>
      </svg>
    ),
  },
  {
    label: 'PetitGuide IA',
    path: '/petitguide',
    desc: "Conseils personnalisés par IA pour le développement et la santé de l'enfant.",
    icon: (
      <svg viewBox="0 0 64 64" className="w-16 h-16 mx-auto" fill="none">
        <circle cx="32" cy="32" r="24" fill="#bfdbfe"/>
        <path d="M20 32 Q20 22 32 22 Q44 22 44 32 Q44 40 36 42 L36 48 L28 48 L28 42 Q20 40 20 32Z" fill="#3b82f6"/>
        <circle cx="26" cy="31" r="2.5" fill="white"/>
        <circle cx="38" cy="31" r="2.5" fill="white"/>
        <path d="M27 38 Q32 42 37 38" stroke="white" strokeWidth="2" strokeLinecap="round" fill="none"/>
      </svg>
    ),
  },
]

const whyItems = [
  { num: '1', title: 'Suivi complet et centralisé', desc: 'Toutes les informations de santé de votre enfant en un seul endroit, accessibles à tout moment.' },
  { num: '2', title: 'Médecins pédiatres qualifiés', desc: 'Partagez facilement le dossier de votre enfant avec son pédiatre pour un suivi optimal.' },
  { num: '3', title: 'Support et conseils IA 24/7', desc: "PetitGuide IA répond à vos questions à toute heure grâce à l'intelligence artificielle." },
]

export default function DashboardPage() {
  const { user } = useAuth()
  const { childList, activeChild, setActiveChild, loading } = useChild()
  const navigate = useNavigate()

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <LoadingSpinner size="lg" />
    </div>
  )

  return (
    <div className="bg-white">

      {/* ══════════════════════════════════════
          HERO
      ══════════════════════════════════════ */}
      <section className="relative overflow-hidden min-h-[520px] flex items-center"
        style={{ background: 'linear-gradient(135deg, #e0f2fe 0%, #f0f9ff 50%, #ffffff 100%)' }}>

        {/* EKG line decoration */}
        <div className="absolute top-8 left-0 w-full opacity-10 pointer-events-none">
          <svg viewBox="0 0 1200 60" className="w-full" preserveAspectRatio="none">
            <path d="M0 30 L200 30 L240 10 L260 50 L280 5 L310 55 L330 30 L600 30 L840 30 L880 10 L900 50 L920 5 L950 55 L970 30 L1200 30"
              stroke="#3b82f6" strokeWidth="2" fill="none"/>
          </svg>
        </div>

        <div className="w-full max-w-7xl mx-auto px-10 flex flex-col md:flex-row items-center gap-10 py-20">
          {/* Text left */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="flex-1 max-w-xl"
          >
            <h1 className="text-5xl font-light text-blue-900 leading-tight mb-3">
              Le Meilleur Suivi Pour
            </h1>
            <h2 className="text-5xl font-extrabold text-blue-900 leading-tight mb-6">
              Chaque Enfant !
            </h2>
            <p className="text-gray-500 text-base leading-relaxed mb-8 max-w-md">
              PediCare AI vous accompagne au quotidien dans le suivi de la santé de vos enfants — vaccinations, croissance, rendez-vous médicaux et bien plus encore.
            </p>
            <div className="flex gap-4 items-center flex-wrap">
              <button
                onClick={() => navigate('/children/new')}
                className="px-7 py-3 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-full transition-all shadow-md hover:shadow-lg text-sm"
              >
                Commencer
              </button>
              <button
                onClick={() => document.getElementById('services-section').scrollIntoView({ behavior: 'smooth' })}
                className="w-10 h-10 rounded-full bg-blue-900 flex items-center justify-center hover:bg-blue-800 transition-colors shadow"
              >
                <svg className="w-4 h-4 text-white ml-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M6.3 2.841A1.5 1.5 0 004 4.11v11.78a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z"/>
                </svg>
              </button>
            </div>
          </motion.div>

          {/* Espace partenaires — carousel pub à droite du hero */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="flex-1 flex justify-center max-w-xl w-full"
          >
            <div className="w-full">
              <AdsCarousel />
            </div>
          </motion.div>
        </div>
      </section>

      {/* ══════════════════════════════════════
          CHILD PROFILES (si connecté avec enfants)
      ══════════════════════════════════════ */}
      <section className="max-w-7xl mx-auto px-10 py-10">
        {childList.length === 0 ? (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            className="text-center py-16 bg-blue-50 rounded-3xl border-2 border-dashed border-blue-200">
            <div className="text-6xl mb-4">👶</div>
            <p className="text-blue-900 font-semibold text-lg mb-2">Aucun profil enfant</p>
            <p className="text-gray-400 text-sm mb-6">Commencez par créer le profil de votre enfant</p>
            <button onClick={() => navigate('/children/new')}
              className="px-7 py-3 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-full transition-all shadow-md text-sm">
              + Ajouter un enfant
            </button>
          </motion.div>
        ) : (
          <div className="space-y-6">
            {/* Selector */}
            <div className="flex gap-3 flex-wrap items-center">
              <p className="text-sm font-semibold text-gray-500 mr-1">Profil :</p>
              {childList.map(child => (
                <button key={child._id} onClick={() => setActiveChild(child)}
                  className={`flex items-center gap-2.5 px-4 py-2.5 rounded-full border-2 text-sm font-medium transition-all ${
                    activeChild?._id === child._id
                      ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-md'
                      : 'border-gray-200 text-gray-500 hover:border-blue-300 bg-white'
                  }`}>
                  <span>{child.gender === 'F' ? '👧' : '👦'}</span>
                  <span>{child.firstName}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${activeChild?._id === child._id ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400'}`}>
                    {computeAge(child.dateOfBirth)}
                  </span>
                </button>
              ))}
              <button onClick={() => navigate('/children/new')}
                className="flex items-center gap-2 px-4 py-2.5 rounded-full border-2 border-dashed border-gray-300 text-sm text-gray-400 hover:border-green-400 hover:text-green-500 transition-all">
                + Ajouter
              </button>
            </div>

            {/* Active child card */}
            {activeChild && (
              <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-2xl shadow">
                    {activeChild.gender === 'F' ? '👧' : '👦'}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">{activeChild.firstName}</h2>
                    <p className="text-sm text-gray-400 mt-0.5">{computeAge(activeChild.dateOfBirth)} · Groupe {activeChild.bloodType || 'Inconnu'}</p>
                    {activeChild.allergies && (
                      <span className="inline-flex items-center gap-1 text-xs bg-amber-50 text-amber-600 px-2.5 py-0.5 rounded-full mt-1">
                        ⚠️ {activeChild.allergies}
                      </span>
                    )}
                  </div>
                </div>
                <button onClick={() => navigate(`/children/${activeChild._id}/edit`)}
                  className="text-sm text-gray-400 hover:text-blue-500 px-3 py-2 rounded-xl hover:bg-blue-50 transition-colors font-medium">
                  ✏️ Modifier
                </button>
              </div>
            )}
          </div>
        )}
      </section>

      {/* ══════════════════════════════════════
          SERVICES
      ══════════════════════════════════════ */}
      <section id="services-section" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-10 text-center mb-14">
          <p className="text-green-500 font-semibold italic text-lg mb-2">Le meilleur pour votre enfant</p>
          <h2 className="text-4xl font-bold text-blue-900 mb-4">Nos fonctionnalités</h2>
          <p className="text-gray-400 max-w-2xl mx-auto text-sm leading-relaxed">
            PediCare AI regroupe tous les outils nécessaires pour suivre la santé et le développement de votre enfant en un seul endroit simple et intuitif.
          </p>
        </div>

        <div className="max-w-7xl mx-auto px-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {services.map(({ label, path, desc, icon }) => (
            <motion.button
              key={path}
              onClick={() => navigate(path)}
              whileHover={{ y: -4 }}
              transition={{ duration: 0.2 }}
              className="bg-gray-50 hover:bg-white hover:shadow-lg rounded-2xl p-8 text-center border border-gray-100 transition-all group"
            >
              <div className="mb-5">{icon}</div>
              <h3 className="text-lg font-bold text-blue-900 mb-2 group-hover:text-blue-600 transition-colors">{label}</h3>
              <p className="text-gray-400 text-sm leading-relaxed">{desc}</p>
            </motion.button>
          ))}
        </div>
      </section>

      {/* ══════════════════════════════════════
          WHY CHOOSE US
      ══════════════════════════════════════ */}
      <section className="relative overflow-hidden">
        <div className="flex flex-col md:flex-row">
          {/* Left blue */}
          <div className="flex-1 bg-blue-900 px-12 py-20 relative overflow-hidden">
            {/* EKG watermark */}
            <div className="absolute top-6 left-0 w-full opacity-10">
              <svg viewBox="0 0 600 40" className="w-full" preserveAspectRatio="none">
                <path d="M0 20 L100 20 L120 5 L135 35 L150 2 L170 38 L185 20 L600 20"
                  stroke="white" strokeWidth="2" fill="none"/>
              </svg>
            </div>

            <p className="text-green-400 font-semibold italic text-lg mb-2">Ce que nous faisons le mieux</p>
            <h2 className="text-4xl font-bold text-white mb-10">Pourquoi nous choisir ?</h2>

            <div className="space-y-8">
              {whyItems.map(({ num, title, desc }) => (
                <div key={num} className="flex gap-5 items-start">
                  <span className="text-5xl font-extrabold text-blue-700 leading-none mt-1">{num}</span>
                  <div>
                    <h3 className="text-white font-bold text-lg mb-1">{title}</h3>
                    <p className="text-blue-200 text-sm leading-relaxed">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right — illustration */}
          <div className="flex-1 bg-gradient-to-br from-blue-100 to-sky-50 flex items-center justify-center p-12 min-h-[400px]">
            <svg viewBox="0 0 380 300" className="w-full max-w-md" aria-hidden="true">
              {/* Doctor smiling */}
              <circle cx="200" cy="90" r="44" fill="#fde68a"/>
              <path d="M160 80 Q166 52 200 48 Q234 52 240 80" fill="#1c1917"/>
              {/* Smile */}
              <path d="M185 100 Q200 114 215 100" stroke="#92400e" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
              {/* Eyes */}
              <circle cx="190" cy="88" r="4" fill="#1c1917"/>
              <circle cx="210" cy="88" r="4" fill="#1c1917"/>
              {/* Glasses */}
              <rect x="182" y="82" width="16" height="12" rx="6" fill="none" stroke="#374151" strokeWidth="2"/>
              <rect x="202" y="82" width="16" height="12" rx="6" fill="none" stroke="#374151" strokeWidth="2"/>
              <path d="M198 88 L202 88" stroke="#374151" strokeWidth="2"/>
              {/* White coat */}
              <rect x="162" y="130" width="76" height="90" rx="12" fill="#f8fafc"/>
              <rect x="178" y="130" width="16" height="90" rx="3" fill="#e2e8f0"/>
              <path d="M178 130 L200 154 L222 130" fill="#e2e8f0"/>
              {/* Stethoscope */}
              <path d="M175 150 Q162 178 166 194 Q170 208 182 208" stroke="#94a3b8" strokeWidth="3" fill="none" strokeLinecap="round"/>
              <circle cx="182" cy="211" r="7" fill="#475569"/>
              {/* Arms */}
              <rect x="126" y="140" width="38" height="14" rx="7" fill="#f8fafc"/>
              <rect x="236" y="140" width="38" height="14" rx="7" fill="#f8fafc"/>
              {/* Hands */}
              <circle cx="122" cy="147" r="10" fill="#fde68a"/>
              <circle cx="278" cy="147" r="10" fill="#fde68a"/>
              {/* Patient hand held */}
              <rect x="88" y="180" width="40" height="12" rx="6" fill="#fde68a" opacity="0.7"/>
              {/* Legs */}
              <rect x="172" y="218" width="20" height="40" rx="8" fill="#1e3a8a"/>
              <rect x="196" y="218" width="20" height="40" rx="8" fill="#1e3a8a"/>
              {/* Floor */}
              <rect x="60" y="260" width="280" height="4" rx="2" fill="#bfdbfe"/>
              {/* Decorative circles */}
              <circle cx="80"  cy="60"  r="14" fill="#bfdbfe" opacity="0.5"/>
              <circle cx="330" cy="80"  r="20" fill="#93c5fd" opacity="0.4"/>
              <circle cx="310" cy="200" r="10" fill="#bfdbfe" opacity="0.6"/>
            </svg>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════
          FOOTER
      ══════════════════════════════════════ */}
      <footer className="bg-blue-900 text-white">
        {/* Newsletter */}
        <div className="border-b border-blue-800 py-12 px-10">
          <div className="max-w-2xl mx-auto text-center">
            <h3 className="text-2xl font-bold mb-6">Accès rapide à votre espace</h3>
            <div className="flex rounded-full overflow-hidden shadow-lg max-w-md mx-auto">
              <input type="email" placeholder="Votre adresse email"
                className="flex-1 px-6 py-3.5 text-gray-800 text-sm outline-none bg-white"/>
              <button className="px-6 py-3.5 bg-blue-500 hover:bg-blue-400 text-white font-semibold text-sm transition-colors whitespace-nowrap">
                S'inscrire
              </button>
            </div>
          </div>
        </div>

        {/* Footer links */}
        <div className="max-w-7xl mx-auto px-10 py-14 grid grid-cols-1 md:grid-cols-4 gap-10">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                <rect x="13" y="3"  width="6" height="26" rx="3" fill="#22c55e"/>
                <rect x="3"  y="13" width="26" height="6" rx="3" fill="#60a5fa"/>
              </svg>
              <span className="font-bold text-lg">PediCare AI</span>
            </div>
            <p className="text-blue-300 text-sm leading-relaxed mb-5">
              Le suivi de santé intelligent pour votre enfant. Disponible partout, à tout moment.
            </p>
            <div className="flex gap-3">
              {['f','t','in'].map(s => (
                <div key={s} className="w-8 h-8 rounded-full bg-blue-800 flex items-center justify-center text-xs text-blue-300 hover:bg-blue-700 cursor-pointer transition-colors">
                  {s}
                </div>
              ))}
            </div>
          </div>

          {/* Links */}
          <div>
            <h4 className="font-bold text-base mb-4">Navigation</h4>
            <ul className="space-y-2.5">
              {['Accueil','Croissance','Vaccination','Agenda','Consultation'].map(l => (
                <li key={l}><span className="text-blue-300 hover:text-white text-sm cursor-pointer transition-colors">{l}</span></li>
              ))}
            </ul>
          </div>

          {/* FAQ */}
          <div>
            <h4 className="font-bold text-base mb-4">FAQ</h4>
            <ul className="space-y-2.5">
              {['Comment créer un profil ?','Comment ajouter un vaccin ?','Comment partager avec mon pédiatre ?','Qu\'est-ce que PetitGuide IA ?'].map(l => (
                <li key={l}><span className="text-blue-300 hover:text-white text-sm cursor-pointer transition-colors">{l}</span></li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-bold text-base mb-4">Contact</h4>
            <ul className="space-y-3">
              <li className="flex items-center gap-2 text-blue-300 text-sm"><span>✉</span> support@pedicare.ai</li>
              <li className="flex items-center gap-2 text-blue-300 text-sm"><span>📞</span> +33 1 23 45 67 89</li>
              <li className="flex items-center gap-2 text-blue-300 text-sm"><span>📍</span> Paris, France</li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-blue-800 py-5 px-10 text-center">
          <p className="text-blue-400 text-xs">©2026 PediCare AI — Tous droits réservés</p>
        </div>
      </footer>

    </div>
  )
}
