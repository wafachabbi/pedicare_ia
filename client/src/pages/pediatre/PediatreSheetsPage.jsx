import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { consultationSheetService } from '../../services/consultationSheet.service'
import ConsultationSheetView from '../../components/consultation/ConsultationSheetView'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import ErrorMessage from '../../components/ui/ErrorMessage'

function computeAge(dateOfBirth) {
  if (!dateOfBirth) return ''
  const now = new Date()
  const dob = new Date(dateOfBirth)
  const months = (now.getFullYear() - dob.getFullYear()) * 12 + (now.getMonth() - dob.getMonth())
  if (months < 24) return `${months} mois`
  return `${Math.floor(months / 12)} ans`
}

const formatDate = (date) => new Date(date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })

export default function PediatreSheetsPage() {
  const [sheets, setSheets] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState(null)

  const loadSheets = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await consultationSheetService.getShared()
      setSheets(res.data.data)
    } catch {
      setError('Erreur lors du chargement des fiches')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadSheets() }, [loadSheets])

  return (
    <div className="max-w-4xl mx-auto space-y-6 p-4">

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-sky-500 to-violet-500 p-7 shadow-xl">
        <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/4" />
        <div className="absolute bottom-0 left-0 w-28 h-28 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2" />
        <div className="relative flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-2xl shrink-0">
            📋
          </div>
          <div>
            <p className="text-sky-100 text-sm font-medium">Espace Professionnel de Santé</p>
            <h1 className="text-2xl font-bold text-white">Fiches partagées</h1>
            <p className="text-white/70 text-sm mt-0.5">
              {sheets.length} fiche{sheets.length !== 1 ? 's' : ''} reçue{sheets.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
      </motion.div>

      <ErrorMessage message={error} onRetry={loadSheets} />

      <AnimatePresence mode="wait">
        {selected ? (
          <motion.div key="detail" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
            <button onClick={() => setSelected(null)}
              className="px-4 py-2 text-sm rounded-xl border border-gray-200 dark:border-slate-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition">
              ← Retour aux fiches
            </button>
            <ConsultationSheetView sheet={selected} childName={selected.childId?.firstName} />
          </motion.div>
        ) : loading ? (
          <div key="loading" className="flex justify-center py-16"><LoadingSpinner size="lg" color="sky" /></div>
        ) : sheets.length === 0 ? (
          <div key="empty" className="text-center py-16 bg-white dark:bg-slate-800 rounded-3xl border-2 border-dashed border-gray-200 dark:border-slate-700">
            <div className="text-5xl mb-3">📋</div>
            <p className="text-gray-400 text-sm">Aucune fiche reçue pour le moment</p>
          </div>
        ) : (
          <motion.div key="list" className="space-y-3">
            {sheets.map((sheet, i) => (
              <motion.button
                key={sheet._id}
                onClick={() => setSelected(sheet)}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="w-full text-left bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 p-5 hover:shadow-md hover:border-sky-200 dark:hover:border-sky-800 transition-all"
              >
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <p className="font-semibold text-gray-800 dark:text-gray-100">
                    👶 {sheet.childId?.firstName || 'Enfant supprimé'}
                  </p>
                  {sheet.childId?.dateOfBirth && (
                    <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300">
                      {computeAge(sheet.childId.dateOfBirth)}
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-500">
                  📅 Reçue le {formatDate(sheet.createdAt)}
                  {sheet.appointmentId?.dateTime && <> · RDV du {formatDate(sheet.appointmentId.dateTime)}</>}
                </p>
                <p className="text-sm text-gray-400 dark:text-gray-400 mt-2 line-clamp-2">{sheet.content?.resume}</p>
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
