import { motion } from 'framer-motion'
import { useAuth } from '../../hooks/useAuth'
import GlassCard from '../../components/ui/GlassCard'

const containerVariants = {
  animate: { transition: { staggerChildren: 0.06 } }
}
const cardVariants = {
  initial: { opacity: 0, scale: 0.97 },
  animate: { opacity: 1, scale: 1, transition: { duration: 0.2 } }
}

const features = [
  {
    icon: '📋',
    title: 'Fiches partagées',
    description: 'Consultez les fiches de consultation partagées par les parents.',
    color: 'text-mint-500',
    bg: 'bg-mint-50 dark:bg-mint-900/20',
    // À implémenter par le membre concerné
  },
  {
    icon: '📊',
    title: 'Courbes de croissance',
    description: 'Visualisez les mesures et courbes de croissance des enfants suivis.',
    color: 'text-sky-500',
    bg: 'bg-sky-50 dark:bg-sky-900/20',
  },
  {
    icon: '💉',
    title: 'Suivi vaccinal',
    description: 'Consultez l\'historique vaccinal et les prochaines échéances.',
    color: 'text-violet-500',
    bg: 'bg-violet-50 dark:bg-violet-900/20',
  },
  {
    icon: '📝',
    title: 'Notes de suivi',
    description: 'Ajoutez des notes médicales sur les patients suivis.',
    color: 'text-amber-500',
    bg: 'bg-amber-50 dark:bg-amber-900/20',
  },
]

export default function PediatreDashboardPage() {
  const { user } = useAuth()

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-sky-100 dark:bg-sky-900/30 flex items-center justify-center text-2xl">
            👨‍⚕️
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              Bonjour, {user?.fullName || 'Dr.'}
            </h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-0.5">
              Espace Professionnel de Santé — PediCare AI
            </p>
          </div>
        </div>
      </motion.div>

      {/* Bannière info */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1, transition: { delay: 0.1 } }}>
        <GlassCard className="p-5 mb-6 border-l-4 border-sky-400">
          <div className="flex items-start gap-3">
            <span className="text-xl">ℹ️</span>
            <div>
              <p className="text-sm font-medium text-gray-800 dark:text-gray-200">Accès professionnel sécurisé</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Vous accédez uniquement aux informations partagées volontairement par les parents. 
                Toutes les consultations sont tracées et sécurisées.
              </p>
            </div>
          </div>
        </GlassCard>
      </motion.div>

      {/* Modules disponibles */}
      <motion.div variants={containerVariants} initial="initial" animate="animate"
        className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {features.map(({ icon, title, description, color, bg }) => (
          <motion.div key={title} variants={cardVariants}>
            <GlassCard className="p-5 h-full">
              <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center text-xl mb-3`}>
                {icon}
              </div>
              <h3 className={`font-semibold ${color} mb-1`}>{title}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">{description}</p>
              <div className="mt-4">
                <span className="text-xs text-gray-400 italic">En cours de développement</span>
              </div>
            </GlassCard>
          </motion.div>
        ))}
      </motion.div>

      {/* Stats placeholder */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1, transition: { delay: 0.3 } }} className="mt-6">
        <GlassCard className="p-5">
          <h3 className="font-semibold text-gray-700 dark:text-gray-300 mb-4">📈 Aperçu rapide</h3>
          <div className="grid grid-cols-3 gap-4 text-center">
            {[
              { label: 'Fiches reçues', value: '—' },
              { label: 'Patients suivis', value: '—' },
              { label: 'Notes ajoutées', value: '—' },
            ].map(({ label, value }) => (
              <div key={label}>
                <p className="text-2xl font-bold text-sky-500">{value}</p>
                <p className="text-xs text-gray-500 mt-1">{label}</p>
              </div>
            ))}
          </div>
        </GlassCard>
      </motion.div>
    </div>
  )
}
