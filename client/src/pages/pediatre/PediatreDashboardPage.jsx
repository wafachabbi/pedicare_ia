import { motion } from 'framer-motion'
import { useAuth } from '../../hooks/useAuth'

const containerVariants = { animate: { transition: { staggerChildren: 0.07 } } }
const cardVariants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.25 } }
}

const features = [
  { icon: '📋', title: 'Fiches partagées', description: 'Consultez les fiches de consultation partagées par les parents.', gradient: 'from-mint-400 to-emerald-400', shadow: 'shadow-mint-200 dark:shadow-mint-900/30' },
  { icon: '📊', title: 'Courbes de croissance', description: 'Visualisez les mesures et courbes de croissance des enfants suivis.', gradient: 'from-sky-400 to-cyan-400', shadow: 'shadow-sky-200 dark:shadow-sky-900/30' },
  { icon: '💉', title: 'Suivi vaccinal', description: 'Consultez l\'historique vaccinal et les prochaines échéances.', gradient: 'from-violet-400 to-purple-400', shadow: 'shadow-violet-200 dark:shadow-violet-900/30' },
  { icon: '📝', title: 'Notes de suivi', description: 'Ajoutez des notes médicales sur les patients suivis.', gradient: 'from-amber-400 to-orange-400', shadow: 'shadow-amber-200 dark:shadow-amber-900/30' },
]

const stats = [
  { label: 'Fiches reçues', value: '—', icon: '📁' },
  { label: 'Patients suivis', value: '—', icon: '👶' },
  { label: 'Notes ajoutées', value: '—', icon: '📝' },
]

export default function PediatreDashboardPage() {
  const { user } = useAuth()

  return (
    <div className="max-w-4xl mx-auto space-y-6 p-2">

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-sky-500 to-violet-500 p-7 shadow-xl shadow-sky-200 dark:shadow-sky-900/30">
        <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/4" />
        <div className="absolute bottom-0 left-0 w-28 h-28 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2" />
        <div className="relative flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-2xl shrink-0">
            👨‍⚕️
          </div>
          <div>
            <p className="text-sky-100 text-sm font-medium">Espace Professionnel de Santé</p>
            <h1 className="text-2xl font-bold text-white">{user?.fullName || 'Dr.'}</h1>
            <p className="text-white/60 text-sm mt-0.5">PediCare AI</p>
          </div>
        </div>
      </motion.div>

      {/* Bannière info */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1, transition: { delay: 0.1 } }}
        className="flex items-start gap-3 p-5 bg-sky-50 dark:bg-sky-900/20 border border-sky-200 dark:border-sky-800 rounded-2xl">
        <span className="text-xl shrink-0">🔒</span>
        <div>
          <p className="text-sm font-semibold text-sky-700 dark:text-sky-300">Accès professionnel sécurisé</p>
          <p className="text-xs text-sky-600 dark:text-sky-400 mt-0.5">
            Vous accédez uniquement aux informations partagées volontairement par les parents. Toutes les consultations sont tracées.
          </p>
        </div>
      </motion.div>

      {/* Stats */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1, transition: { delay: 0.15 } }}
        className="grid grid-cols-3 gap-4">
        {stats.map(({ label, value, icon }) => (
          <div key={label} className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 p-5 text-center">
            <div className="text-2xl mb-2">{icon}</div>
            <p className="text-2xl font-bold text-sky-500">{value}</p>
            <p className="text-xs text-gray-400 mt-1">{label}</p>
          </div>
        ))}
      </motion.div>

      {/* Modules */}
      <motion.div variants={containerVariants} initial="initial" animate="animate"
        className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {features.map(({ icon, title, description, gradient, shadow }) => (
          <motion.div key={title} variants={cardVariants}>
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 p-5 h-full hover:shadow-md transition-shadow">
              <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center text-xl shadow-md ${shadow} mb-3`}>
                {icon}
              </div>
              <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-1">{title}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">{description}</p>
              <span className="inline-block mt-4 text-xs text-gray-400 bg-gray-50 dark:bg-slate-700 px-3 py-1 rounded-full">En cours de développement</span>
            </div>
          </motion.div>
        ))}
      </motion.div>
    </div>
  )
}
