import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '../hooks/useAuth'
import { useChild } from '../hooks/useChild'
import LoadingSpinner from '../components/ui/LoadingSpinner'

const containerVariants = { animate: { transition: { staggerChildren: 0.07 } } }
const cardVariants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.25 } }
}

function computeAge(dateOfBirth) {
  const now = new Date()
  const dob = new Date(dateOfBirth)
  const months = (now.getFullYear() - dob.getFullYear()) * 12 + (now.getMonth() - dob.getMonth())
  if (months < 24) return `${months} mois`
  return `${Math.floor(months / 12)} ans`
}

const modules = [
  { icon: '📈', label: 'Croissance', path: '/growth', gradient: 'from-mint-400 to-emerald-400', shadow: 'shadow-mint-200 dark:shadow-mint-900/30' },
  { icon: '💉', label: 'Vaccination', path: '/vaccination', gradient: 'from-sky-400 to-cyan-400', shadow: 'shadow-sky-200 dark:shadow-sky-900/30' },
  { icon: '📅', label: 'Agenda', path: '/agenda', gradient: 'from-violet-400 to-purple-400', shadow: 'shadow-violet-200 dark:shadow-violet-900/30' },
  { icon: '📔', label: 'Journal', path: '/journal', gradient: 'from-amber-400 to-orange-400', shadow: 'shadow-amber-200 dark:shadow-amber-900/30' },
  { icon: '🕐', label: 'Frise', path: '/timeline', gradient: 'from-pink-400 to-rose-400', shadow: 'shadow-pink-200 dark:shadow-pink-900/30' },
  { icon: '🩺', label: 'Consultation', path: '/consultation', gradient: 'from-teal-400 to-emerald-500', shadow: 'shadow-teal-200 dark:shadow-teal-900/30' },
  { icon: '✨', label: 'PetitGuide IA', path: '/petitguide', gradient: 'from-violet-500 to-indigo-500', shadow: 'shadow-violet-200 dark:shadow-violet-900/30' },
]

export default function DashboardPage() {
  const { user } = useAuth()
  const { childList, activeChild, setActiveChild, loading } = useChild()
  const navigate = useNavigate()

  if (loading) return <div className="flex items-center justify-center h-64"><LoadingSpinner size="lg" /></div>

  return (
    <div className="max-w-5xl mx-auto space-y-6 p-2">

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-mint-500 to-sky-400 p-7 shadow-xl shadow-mint-200 dark:shadow-mint-900/30">
        <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/4" />
        <div className="absolute bottom-0 left-0 w-28 h-28 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2" />
        <div className="relative">
          <p className="text-mint-100 text-sm font-medium mb-1">Bienvenue 👋</p>
          <h1 className="text-2xl font-bold text-white">{user?.email?.split('@')[0]}</h1>
          <p className="text-white/70 text-sm mt-1">PediCare AI — Tableau de bord</p>
        </div>
      </motion.div>

      {childList.length === 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="text-center py-20 bg-white dark:bg-slate-800 rounded-3xl border-2 border-dashed border-gray-200 dark:border-slate-700">
          <div className="text-6xl mb-4">👶</div>
          <p className="text-gray-600 dark:text-gray-300 font-semibold mb-2">Aucun profil enfant</p>
          <p className="text-gray-400 text-sm mb-6">Commencez par créer le profil de votre enfant</p>
          <button onClick={() => navigate('/children/new')}
            className="px-6 py-3 bg-gradient-to-r from-mint-500 to-sky-400 text-white font-semibold rounded-2xl hover:shadow-lg hover:scale-[1.02] transition-all text-sm">
            + Ajouter un enfant
          </button>
        </motion.div>
      ) : (
        <>
          {/* Sélecteur enfants */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3 flex-wrap">
            {childList.map(child => (
              <button key={child._id} onClick={() => setActiveChild(child)}
                className={`flex items-center gap-2.5 px-4 py-2.5 rounded-2xl border-2 text-sm font-medium transition-all ${
                  activeChild?._id === child._id
                    ? 'border-mint-500 bg-gradient-to-r from-mint-50 to-sky-50 dark:from-mint-900/20 dark:to-sky-900/20 text-mint-700 dark:text-mint-400 shadow-md'
                    : 'border-gray-200 dark:border-slate-600 text-gray-500 dark:text-gray-400 hover:border-mint-300 bg-white dark:bg-slate-800'
                }`}>
                <span className="text-base">{child.gender === 'F' ? '👧' : '👦'}</span>
                <span>{child.firstName}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${activeChild?._id === child._id ? 'bg-mint-100 dark:bg-mint-900/40 text-mint-600' : 'bg-gray-100 dark:bg-slate-700 text-gray-400'}`}>
                  {computeAge(child.dateOfBirth)}
                </span>
              </button>
            ))}
            <button onClick={() => navigate('/children/new')}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl border-2 border-dashed border-gray-300 dark:border-slate-600 text-sm text-gray-400 hover:border-mint-400 hover:text-mint-500 transition-all bg-white dark:bg-slate-800">
              + Ajouter
            </button>
          </motion.div>

          {/* Fiche enfant actif */}
          {activeChild && (
            <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}
              className="bg-white dark:bg-slate-800 rounded-3xl border border-gray-100 dark:border-slate-700 p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-mint-400 to-sky-400 flex items-center justify-center text-2xl shadow-md">
                    {activeChild.gender === 'F' ? '👧' : '👦'}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">{activeChild.firstName}</h2>
                    <p className="text-sm text-gray-400 mt-0.5">{computeAge(activeChild.dateOfBirth)} · Groupe {activeChild.bloodType || 'Inconnu'}</p>
                    {activeChild.allergies && (
                      <span className="inline-flex items-center gap-1 text-xs bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 px-2.5 py-0.5 rounded-full mt-1 font-medium">
                        ⚠️ {activeChild.allergies}
                      </span>
                    )}
                  </div>
                </div>
                <button onClick={() => navigate(`/children/${activeChild._id}/edit`)}
                  className="text-sm text-gray-400 hover:text-mint-500 transition-colors px-3 py-2 rounded-xl hover:bg-mint-50 dark:hover:bg-mint-900/20 font-medium">
                  ✏️ Modifier
                </button>
              </div>
            </motion.div>
          )}

          {/* Modules */}
          <motion.div variants={containerVariants} initial="initial" animate="animate"
            className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {modules.map(({ icon, label, path, gradient, shadow }) => (
              <motion.div key={path} variants={cardVariants}>
                <button onClick={() => navigate(path)}
                  className="w-full bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 p-5 text-center hover:shadow-lg hover:border-transparent hover:scale-[1.03] transition-all group">
                  <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center text-2xl mx-auto mb-3 shadow-lg ${shadow} group-hover:scale-110 transition-transform`}>
                    {icon}
                  </div>
                  <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">{label}</p>
                </button>
              </motion.div>
            ))}
          </motion.div>
        </>
      )}
    </div>
  )
}
