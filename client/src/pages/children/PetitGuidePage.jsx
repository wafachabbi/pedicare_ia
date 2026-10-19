import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useChild } from '../../hooks/useChild'
import { aiService } from '../../services/ai.service'

const REMINDER_CONFIG = {
  urgent:  { color: 'bg-red-50 border-red-200',    icon: '🚨', badge: 'bg-red-100 text-red-700' },
  warning: { color: 'bg-amber-50 border-amber-200', icon: '⚠️', badge: 'bg-amber-100 text-amber-700' },
  info:    { color: 'bg-blue-50 border-blue-200',   icon: 'ℹ️', badge: 'bg-blue-100 text-blue-700' },
}

export default function PetitGuidePage() {
  const { activeChild, childList, setActiveChild } = useChild()
  const [summary, setSummary] = useState('')
  const [reminders, setReminders] = useState([])
  const [loadingSummary, setLoadingSummary] = useState(false)
  const [loadingReminders, setLoadingReminders] = useState(false)
  const [error, setError] = useState('')

  const handleSummary = async () => {
    if (!activeChild) return
    setLoadingSummary(true)
    setError('')
    setSummary('')
    try {
      const res = await aiService.getSummary(activeChild._id)
      setSummary(res.data.data.summary)
    } catch {
      setError('Erreur lors de la génération du résumé.')
    } finally {
      setLoadingSummary(false)
    }
  }

  const handleReminders = async () => {
    if (!activeChild) return
    setLoadingReminders(true)
    setError('')
    setReminders([])
    try {
      const res = await aiService.getReminders(activeChild._id)
      setReminders(res.data.data.reminders)
    } catch {
      setError('Erreur lors de la génération des rappels.')
    } finally {
      setLoadingReminders(false)
    }
  }

  if (!activeChild) return (
    <div className="text-center py-16 text-gray-400 p-6">
      <p className="text-4xl mb-3">👶</p>
      <p>Sélectionnez un profil enfant depuis l'accueil.</p>
    </div>
  )

  return (
    <div className="p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-violet-500 to-indigo-500 p-8 mb-8 shadow-xl">
        <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2" />
        <div className="relative">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-4xl">✨</span>
            <h1 className="text-3xl font-bold text-white">PetitGuide IA</h1>
          </div>
          <p className="text-violet-100 text-sm">Assistant santé intelligent pour {activeChild.firstName}</p>
          <div className="mt-2 inline-flex items-center gap-1.5 bg-white/20 backdrop-blur rounded-full px-3 py-1">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"/>
            <span className="text-white text-xs font-medium">Propulsé par Qwen3 via Groq</span>
          </div>
        </div>
      </div>

      {/* Child selector */}
      {childList.length > 1 && (
        <div className="flex gap-2 flex-wrap mb-6">
          {childList.map(c => (
            <button key={c._id} onClick={() => { setActiveChild(c); setSummary(''); setReminders([]) }}
              className={`px-4 py-2 rounded-full text-sm font-semibold border-2 transition-all ${
                activeChild._id === c._id
                  ? 'border-violet-500 bg-violet-50 text-violet-700'
                  : 'border-gray-200 text-gray-500 hover:border-violet-300 bg-white'
              }`}>
              {c.gender === 'F' ? '👧' : '👦'} {c.firstName}
            </button>
          ))}
        </div>
      )}

      {error && (
        <div className="mb-5 p-4 bg-red-50 border border-red-200 rounded-2xl text-red-600 text-sm">{error}</div>
      )}

      {/* Two action cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        {/* Summary card */}
        <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm">
          <div className="w-12 h-12 rounded-2xl bg-violet-100 flex items-center justify-center text-2xl mb-4">📋</div>
          <h2 className="font-bold text-gray-800 text-lg mb-1">Résumé du dossier</h2>
          <p className="text-gray-400 text-sm mb-5">L'IA analyse les vaccinations, RDV et informations de {activeChild.firstName} pour générer un résumé médical.</p>
          <button onClick={handleSummary} disabled={loadingSummary}
            className="w-full py-3 bg-gradient-to-r from-violet-500 to-indigo-500 disabled:opacity-60 text-white font-semibold rounded-2xl hover:shadow-lg transition-all flex items-center justify-center gap-2">
            {loadingSummary ? (
              <>
                <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin"/>
                Génération...
              </>
            ) : '✨ Générer le résumé'}
          </button>
        </div>

        {/* Reminders card */}
        <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm">
          <div className="w-12 h-12 rounded-2xl bg-amber-100 flex items-center justify-center text-2xl mb-4">🔔</div>
          <h2 className="font-bold text-gray-800 text-lg mb-1">Rappels intelligents</h2>
          <p className="text-gray-400 text-sm mb-5">L'IA détecte les vaccins manquants et recommande des actions basées sur l'âge de {activeChild.firstName}.</p>
          <button onClick={handleReminders} disabled={loadingReminders}
            className="w-full py-3 bg-gradient-to-r from-amber-400 to-orange-400 disabled:opacity-60 text-white font-semibold rounded-2xl hover:shadow-lg transition-all flex items-center justify-center gap-2">
            {loadingReminders ? (
              <>
                <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin"/>
                Analyse...
              </>
            ) : '🔔 Analyser les rappels'}
          </button>
        </div>
      </div>

      {/* Summary result */}
      <AnimatePresence>
        {summary && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="mb-6 bg-white rounded-3xl border border-violet-100 shadow-sm overflow-hidden">
            <div className="bg-gradient-to-r from-violet-500 to-indigo-500 px-6 py-4 flex items-center gap-3">
              <span className="text-2xl">📋</span>
              <div>
                <h3 className="text-white font-bold">Résumé médical — {activeChild.firstName}</h3>
                <p className="text-violet-200 text-xs">Généré par LLaMA 3.1</p>
              </div>
            </div>
            <div className="p-6">
              <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap">{summary}</p>
              <div className="mt-4 pt-4 border-t border-gray-100 flex items-center gap-2">
                <span className="text-xs text-gray-400">⚠️ Ce résumé est généré par IA et ne remplace pas un avis médical professionnel.</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reminders result */}
      <AnimatePresence>
        {reminders.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
              <span className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center text-amber-600">🔔</span>
              Rappels pour {activeChild.firstName}
            </h3>
            <div className="space-y-3">
              {reminders.map((r, i) => {
                const cfg = REMINDER_CONFIG[r.type] || REMINDER_CONFIG.info
                return (
                  <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.08 }}
                    className={`rounded-2xl border p-4 ${cfg.color}`}>
                    <div className="flex items-start gap-3">
                      <span className="text-xl shrink-0">{cfg.icon}</span>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-bold text-gray-800 text-sm">{r.title}</p>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${cfg.badge}`}>
                            {r.type === 'urgent' ? 'Urgent' : r.type === 'warning' ? 'Attention' : 'Info'}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 leading-relaxed">{r.message}</p>
                        {r.action && (
                          <p className="text-xs font-semibold text-gray-500 mt-2">
                            → {r.action}
                          </p>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </div>
            <p className="text-xs text-gray-400 mt-4 text-center">
              ⚠️ Ces rappels sont générés par IA et ne remplacent pas un avis médical professionnel.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
