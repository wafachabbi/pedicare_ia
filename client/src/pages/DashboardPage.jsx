import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '../hooks/useAuth'
import { useChild } from '../hooks/useChild'
import GlassCard from '../components/ui/GlassCard'
import LoadingSpinner from '../components/ui/LoadingSpinner'

const containerVariants = { animate: { transition: { staggerChildren: 0.07 } } }
const cardVariants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.25 } }
}

// Calcul de l'âge en texte lisible
function computeAge(dateOfBirth) {
  const now = new Date()
  const dob = new Date(dateOfBirth)
  const months = (now.getFullYear() - dob.getFullYear()) * 12 + (now.getMonth() - dob.getMonth())
  if (months < 24) return `${months} mois`
  return `${Math.floor(months / 12)} ans`
}

export default function DashboardPage() {
  const { user } = useAuth()
  const { childList, activeChild, setActiveChild, loading } = useChild()
  const navigate = useNavigate()

  const modules = [
    { icon: '📈', label: 'Croissance', path: '/growth', color: 'text-mint-500', bg: 'bg-mint-50 dark:bg-mint-900/20' },
    { icon: '💉', label: 'Vaccination', path: '/vaccination', color: 'text-sky-500', bg: 'bg-sky-50 dark:bg-sky-900/20' },
    { icon: '📅', label: 'Agenda', path: '/agenda', color: 'text-violet-500', bg: 'bg-violet-50 dark:bg-violet-900/20' },
    { icon: '📔', label: 'Journal', path: '/journal', color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-900/20' },
    { icon: '🕐', label: 'Frise', path: '/timeline', color: 'text-pink-500', bg: 'bg-pink-50 dark:bg-pink-900/20' },
    { icon: '🩺', label: 'Consultation', path: '/consultation', color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
    { icon: '✨', label: 'PetitGuide IA', path: '/petitguide', color: 'text-violet-600', bg: 'bg-violet-100 dark:bg-violet-900/30' },
  ]

  if (loading) {
    return <div className="flex items-center justify-center h-64"><LoadingSpinner size="lg" /></div>
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          👋 Bonjour, {user?.email?.split('@')[0]}
        </h1>
        <p className="text-gray-400 text-sm mt-1">Tableau de bord PediCare AI</p>
      </motion.div>

      {/* Sélecteur d'enfants */}
      {childList.length === 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <GlassCard className="p-8 text-center">
            <div className="text-5xl mb-4">👶</div>
            <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Aucun profil enfant
            </h2>
            <p className="text-sm text-gray-400 mb-6">
              Commencez par créer le profil de votre enfant pour accéder à toutes les fonctionnalités.
            </p>
            <button
              onClick={() => navigate('/children/new')}
              className="px-6 py-3 bg-mint-500 hover:bg-mint-400 text-white font-semibold rounded-xl transition-colors"
            >
              + Ajouter un enfant
            </button>
          </GlassCard>
        </motion.div>
      ) : (
        <>
          {/* Profils enfants */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3 flex-wrap">
            {childList.map(child => (
              <button
                key={child._id}
                onClick={() => setActiveChild(child)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 text-sm font-medium transition-all ${
                  activeChild?._id === child._id
                    ? 'border-mint-500 bg-mint-50 dark:bg-mint-900/20 text-mint-700 dark:text-mint-400'
                    : 'border-gray-200 dark:border-slate-600 text-gray-600 dark:text-gray-400 hover:border-mint-300'
                }`}
              >
                <span>{child.gender === 'F' ? '👧' : '👦'}</span>
                <span>{child.firstName}</span>
                <span className="text-xs opacity-70">{computeAge(child.dateOfBirth)}</span>
              </button>
            ))}
            <button
              onClick={() => navigate('/children/new')}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-dashed border-gray-300 dark:border-slate-600 text-sm text-gray-400 hover:border-mint-400 hover:text-mint-500 transition-all"
            >
              + Ajouter
            </button>
          </motion.div>

          {/* Info enfant actif */}
          {activeChild && (
            <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}>
              <GlassCard className="p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-mint-100 dark:bg-mint-900/30 flex items-center justify-center text-2xl">
                      {activeChild.gender === 'F' ? '👧' : '👦'}
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">{activeChild.firstName}</h2>
                      <p className="text-sm text-gray-400">{computeAge(activeChild.dateOfBirth)} • Groupe sanguin : {activeChild.bloodType || 'Inconnu'}</p>
                      {activeChild.allergies && (
                        <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">⚠️ Allergies : {activeChild.allergies}</p>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => navigate(`/children/${activeChild._id}/edit`)}
                    className="text-sm text-gray-400 hover:text-mint-500 transition-colors px-3 py-1.5 rounded-lg hover:bg-mint-50 dark:hover:bg-mint-900/20"
                  >
                    ✏️ Modifier
                  </button>
                </div>
              </GlassCard>
            </motion.div>
          )}

          {/* Modules */}
          <motion.div variants={containerVariants} initial="initial" animate="animate"
            className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {modules.map(({ icon, label, path, color, bg }) => (
              <motion.div key={path} variants={cardVariants}>
                <GlassCard className="p-4 text-center" onClick={() => navigate(path)}>
                  <div className={`w-12 h-12 rounded-xl ${bg} flex items-center justify-center text-2xl mx-auto mb-3`}>
                    {icon}
                  </div>
                  <p className={`text-sm font-semibold ${color}`}>{label}</p>
                </GlassCard>
              </motion.div>
            ))}
          </motion.div>
        </>
      )}
    </div>
  )
}
