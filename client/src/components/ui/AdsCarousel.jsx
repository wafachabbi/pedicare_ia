import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { adsService } from '../../services/ads.service'

const BADGE_COLORS = {
  blue:    'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  rose:    'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
  emerald: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  orange:  'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
  violet:  'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
}

export default function AdsCarousel() {
  const [ads, setAds] = useState([])
  const [current, setCurrent] = useState(0)
  const [direction, setDirection] = useState(1)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    adsService.getActive()
      .then(res => setAds(res.data.data))
      .catch(() => {}) // silencieux si l'API échoue
      .finally(() => setLoading(false))
  }, [])

  const goTo = useCallback((index, dir = 1) => {
    setDirection(dir)
    setCurrent(index)
  }, [])

  const next = useCallback(() => {
    if (ads.length <= 1) return
    goTo((current + 1) % ads.length, 1)
  }, [current, ads.length, goTo])

  const prev = useCallback(() => {
    if (ads.length <= 1) return
    goTo((current - 1 + ads.length) % ads.length, -1)
  }, [current, ads.length, goTo])

  // Auto-play toutes les 5 secondes
  useEffect(() => {
    if (ads.length <= 1) return
    const timer = setInterval(next, 5000)
    return () => clearInterval(timer)
  }, [next, ads.length])

  if (loading || ads.length === 0) return null

  const ad = ads[current]

  const variants = {
    enter:  (dir) => ({ x: dir > 0 ? 60 : -60, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit:   (dir) => ({ x: dir > 0 ? -60 : 60, opacity: 0 })
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-3xl border border-gray-100 dark:border-slate-700 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-4 pb-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Espace partenaires</span>
          <span className="text-[10px] bg-gray-100 dark:bg-slate-700 text-gray-400 dark:text-gray-500 px-2 py-0.5 rounded-full">Publicité</span>
        </div>
        {ads.length > 1 && (
          <div className="flex items-center gap-1">
            <button onClick={prev} className="w-7 h-7 rounded-full bg-gray-100 dark:bg-slate-700 text-gray-500 hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors text-xs flex items-center justify-center" aria-label="Précédent">‹</button>
            <button onClick={next} className="w-7 h-7 rounded-full bg-gray-100 dark:bg-slate-700 text-gray-500 hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors text-xs flex items-center justify-center" aria-label="Suivant">›</button>
          </div>
        )}
      </div>

      {/* Contenu carousel */}
      <div className="relative overflow-hidden" style={{ height: '200px' }}>
        <AnimatePresence custom={direction} mode="wait">
          <motion.a
            key={ad._id}
            href={ad.link && ad.link !== '#' ? ad.link : undefined}
            target={ad.link && ad.link !== '#' ? '_blank' : undefined}
            rel="noopener noreferrer"
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.35, ease: 'easeInOut' }}
            className="absolute inset-0 flex items-center gap-5 px-5 group"
            style={{ cursor: ad.link && ad.link !== '#' ? 'pointer' : 'default' }}
          >
            {/* Image */}
            <div className="shrink-0 w-44 h-44 rounded-2xl overflow-hidden bg-gray-50 dark:bg-slate-700 shadow-md">
              <img
                src={adsService.getImageUrl(ad._id)}
                alt={ad.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
            </div>

            {/* Texte */}
            <div className="flex-1 min-w-0">
              {ad.badge && (
                <div className="mb-2">
                  <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${BADGE_COLORS[ad.badgeColor] || BADGE_COLORS.blue}`}>
                    {ad.badge}
                  </span>
                </div>
              )}
              <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-1">{ad.title}</h3>
              {ad.description && (
                <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{ad.description}</p>
              )}
              {ad.link && ad.link !== '#' && (
                <span className="inline-flex items-center gap-1 mt-3 text-xs font-semibold text-blue-600 dark:text-blue-400 group-hover:underline">
                  En savoir plus →
                </span>
              )}
            </div>
          </motion.a>
        </AnimatePresence>
      </div>

      {/* Indicateurs dots */}
      {ads.length > 1 && (
        <div className="flex items-center justify-center gap-1.5 pb-4 pt-2">
          {ads.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i, i > current ? 1 : -1)}
              className={`rounded-full transition-all ${i === current ? 'w-5 h-2 bg-blue-500' : 'w-2 h-2 bg-gray-200 dark:bg-slate-600 hover:bg-gray-300'}`}
              aria-label={`Publicité ${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  )
}
