import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useAuth } from '../../hooks/useAuth'
import api from '../../services/api'
import LoadingSpinner from '../../components/ui/LoadingSpinner'

function computeAge(dateOfBirth) {
  const now = new Date()
  const dob = new Date(dateOfBirth)
  const months = (now.getFullYear() - dob.getFullYear()) * 12 + (now.getMonth() - dob.getMonth())
  if (months < 24) return `${months} mois`
  return `${Math.floor(months / 12)} ans`
}

const TYPE_CONFIG = {
  consultation: { label: 'Consultation', icon: '🩺', bg: 'bg-sky-50', text: 'text-sky-600' },
  exam:         { label: 'Examen',       icon: '🔬', bg: 'bg-violet-50', text: 'text-violet-600' }
}

export default function PediatreDashboardPage({ defaultTab = 'appointments' }) {
  const { user } = useAuth()
  const [tab, setTab] = useState(defaultTab)
  const [appointments, setAppointments] = useState([])
  const [vaccinations, setVaccinations] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const load = async () => {
      try {
        const [apptRes, vaccRes] = await Promise.all([
          api.get('/pediatre/appointments'),
          api.get('/pediatre/vaccinations')
        ])
        setAppointments(apptRes.data.data)
        setVaccinations(vaccRes.data.data)
      } catch {
        setError('Erreur lors du chargement')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const upcoming = appointments.filter(a => a.status === 'upcoming')
  const past = appointments.filter(a => a.status === 'past')

  return (
    <div className="max-w-4xl mx-auto space-y-6 p-4">

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-sky-500 to-violet-500 p-7 shadow-xl">
        <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/4" />
        <div className="absolute bottom-0 left-0 w-28 h-28 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2" />
        <div className="relative flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-2xl shrink-0">
            👨‍⚕️
          </div>
          <div>
            <p className="text-sky-100 text-sm font-medium">Espace Professionnel de Santé</p>
            <h1 className="text-2xl font-bold text-white">{user?.fullName ? `Dr. ${user.fullName}` : user?.email}</h1>
            {user?.speciality && <p className="text-white/70 text-sm mt-0.5">{user.speciality}</p>}
          </div>
        </div>
      </motion.div>

      {/* Stats */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1, transition: { delay: 0.1 } }}
        className="grid grid-cols-3 gap-4">
        {[
          { label: 'RDV à venir', value: upcoming.length, icon: '📅', color: 'text-sky-500' },
          { label: 'RDV passés',  value: past.length,     icon: '📁', color: 'text-violet-500' },
          { label: 'Vaccinations', value: vaccinations.length, icon: '💉', color: 'text-emerald-500' },
        ].map(({ label, value, icon, color }) => (
          <div key={label} className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 p-5 text-center">
            <div className="text-2xl mb-2">{icon}</div>
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
            <p className="text-xs text-gray-400 mt-1">{label}</p>
          </div>
        ))}
      </motion.div>

      {/* Tabs */}
      <div className="flex gap-2">
        <button onClick={() => setTab('appointments')}
          className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${
            tab === 'appointments'
              ? 'bg-sky-500 text-white shadow'
              : 'bg-white dark:bg-slate-800 text-gray-500 border border-gray-100 dark:border-slate-700 hover:border-sky-300'
          }`}>
          📅 Rendez-vous ({appointments.length})
        </button>
        <button onClick={() => setTab('vaccinations')}
          className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${
            tab === 'vaccinations'
              ? 'bg-emerald-500 text-white shadow'
              : 'bg-white dark:bg-slate-800 text-gray-500 border border-gray-100 dark:border-slate-700 hover:border-emerald-300'
          }`}>
          💉 Vaccinations ({vaccinations.length})
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-red-600 text-sm">{error}</div>
      )}

      {loading ? (
        <div className="flex justify-center py-16"><LoadingSpinner size="lg" /></div>
      ) : (
        <>
          {/* Appointments tab */}
          {tab === 'appointments' && (
            <div className="space-y-3">
              {appointments.length === 0 ? (
                <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-3xl border-2 border-dashed border-gray-200 dark:border-slate-700">
                  <div className="text-5xl mb-3">📅</div>
                  <p className="text-gray-400 text-sm">Aucun rendez-vous assigné pour l'instant</p>
                </div>
              ) : (
                <>
                  {upcoming.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-2 h-2 bg-sky-400 rounded-full"/>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">À venir</p>
                        <span className="bg-sky-100 text-sky-600 text-xs font-bold px-2 py-0.5 rounded-full">{upcoming.length}</span>
                      </div>
                      {upcoming.map(a => <AppointmentRow key={a._id} a={a} />)}
                    </div>
                  )}
                  {past.length > 0 && (
                    <div className="mt-4">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-2 h-2 bg-gray-300 rounded-full"/>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Passés</p>
                        <span className="bg-gray-100 text-gray-500 text-xs font-bold px-2 py-0.5 rounded-full">{past.length}</span>
                      </div>
                      <div className="opacity-70 space-y-3">
                        {past.map(a => <AppointmentRow key={a._id} a={a} />)}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Vaccinations tab */}
          {tab === 'vaccinations' && (
            <div className="space-y-3">
              {vaccinations.length === 0 ? (
                <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-3xl border-2 border-dashed border-gray-200 dark:border-slate-700">
                  <div className="text-5xl mb-3">💉</div>
                  <p className="text-gray-400 text-sm">Aucune vaccination assignée pour l'instant</p>
                </div>
              ) : vaccinations.map(v => <VaccinationRow key={v._id} v={v} />)}
            </div>
          )}
        </>
      )}
    </div>
  )
}

function AppointmentRow({ a }) {
  const cfg = TYPE_CONFIG[a.type] || TYPE_CONFIG.consultation
  const dateObj = new Date(a.dateTime)
  const child = a.childId

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 p-4 flex items-start gap-4 hover:shadow-md transition-shadow">
      <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${a.type === 'exam' ? 'from-violet-400 to-purple-400' : 'from-sky-400 to-blue-400'} flex flex-col items-center justify-center shadow shrink-0`}>
        <span className="text-white text-base font-bold leading-none">{dateObj.getDate()}</span>
        <span className="text-white/80 text-xs">{dateObj.toLocaleDateString('fr-FR', { month: 'short' })}</span>
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${cfg.bg} ${cfg.text}`}>
            {cfg.icon} {cfg.label}
          </span>
          {a.status === 'upcoming' && (
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-600">À venir</span>
          )}
        </div>
        <p className="font-semibold text-gray-800 dark:text-gray-100 text-sm">
          {dateObj.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
          {' · '}
          <span className="text-sky-500">{dateObj.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
        </p>
        {child && (
          <p className="text-sm text-gray-500 mt-0.5">
            👶 {child.firstName} · {computeAge(child.dateOfBirth)} · {child.gender === 'F' ? '👧' : '👦'}
          </p>
        )}
        {a.notes && <p className="text-xs text-gray-400 mt-1 truncate">📝 {a.notes}</p>}
      </div>
    </div>
  )
}

function VaccinationRow({ v }) {
  const child = v.childId
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 p-4 flex items-center gap-4 hover:shadow-md transition-shadow">
      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-400 flex items-center justify-center text-xl shadow shrink-0">
        💉
      </div>
      <div className="flex-1">
        <p className="font-semibold text-gray-800 dark:text-gray-100">{v.vaccineName}</p>
        <p className="text-sm text-gray-500 mt-0.5">
          📅 {new Date(v.administeredAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
        {child && (
          <p className="text-sm text-gray-400 mt-0.5">
            👶 {child.firstName} · {computeAge(child.dateOfBirth)}
          </p>
        )}
        {v.lotNumber && (
          <span className="text-xs bg-emerald-50 text-emerald-600 px-2.5 py-0.5 rounded-full font-medium mt-1 inline-block">
            Lot {v.lotNumber}
          </span>
        )}
      </div>
    </div>
  )
}
