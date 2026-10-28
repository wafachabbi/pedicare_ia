import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { adsService } from '../services/ads.service'
import { aiService } from '../services/ai.service'
import ConfirmModal from '../components/ui/ConfirmModal'
import LoadingSpinner from '../components/ui/LoadingSpinner'

const BADGE_COLORS = [
  { value: 'blue',    label: 'Bleu',   bg: 'bg-blue-500' },
  { value: 'rose',    label: 'Rose',   bg: 'bg-rose-500' },
  { value: 'emerald', label: 'Vert',   bg: 'bg-emerald-500' },
  { value: 'orange',  label: 'Orange', bg: 'bg-orange-500' },
  { value: 'violet',  label: 'Violet', bg: 'bg-violet-500' },
]

const emptyForm = { title: '', description: '', badge: '', badgeColor: 'blue', link: '' }

export default function AdsAdminPage() {
  const [ads, setAds]               = useState([])
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState('')
  const [showForm, setShowForm]     = useState(false)
  const [editId, setEditId]         = useState(null)   // null = création, id = édition
  const [form, setForm]             = useState(emptyForm)
  const [selectedFile, setSelectedFile] = useState(null)
  const [preview, setPreview]       = useState(null)   // URL blob pour prévisualisation
  const [formError, setFormError]   = useState('')
  const [saving, setSaving]         = useState(false)
  const [aiLoading, setAiLoading]   = useState(false) // analyse IA en cours
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [dragOver, setDragOver]     = useState(false)
  const fileInputRef = useRef(null)

  // ── Chargement ─────────────────────────────────────────────────────────────
  const load = async () => {
    try {
      setLoading(true)
      const res = await adsService.getAll()
      setAds(res.data.data)
    } catch { setError('Erreur lors du chargement') }
    finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  // ── Gestion image + analyse IA automatique ────────────────────────────────
  const handleFileSelect = async (file) => {
    if (!file) return
    const allowed = ['image/jpeg', 'image/png', 'image/webp']
    if (!allowed.includes(file.type)) { setFormError('Format non supporté. JPEG, PNG ou WEBP.'); return }
    if (file.size > 10 * 1024 * 1024) { setFormError('Image trop lourde (max 10 Mo)'); return }
    setSelectedFile(file)
    setPreview(URL.createObjectURL(file))
    setFormError('')

    // ── Analyse IA automatique dès que l'image est sélectionnée ──────────
    setAiLoading(true)
    try {
      const res = await aiService.analyzeImage(file.name)
      const { title, description, badge, badgeColor } = res.data.data
      setForm(f => ({
        ...f,
        title:       title       || f.title,
        description: description || f.description,
        badge:       badge       || f.badge,
        badgeColor:  badgeColor  || f.badgeColor
      }))
    } catch {
      // Silencieux — l'utilisateur peut remplir manuellement
    } finally {
      setAiLoading(false)
    }
  }
  const handleDrop = (e) => {
    e.preventDefault(); setDragOver(false)
    handleFileSelect(e.dataTransfer.files?.[0])
  }

  // ── Ouvrir formulaire création ─────────────────────────────────────────────
  const openCreate = () => {
    setForm(emptyForm)
    setEditId(null)
    setSelectedFile(null)
    setPreview(null)
    setFormError('')
    setShowForm(true)
  }

  // ── Ouvrir formulaire édition ──────────────────────────────────────────────
  const openEdit = (ad) => {
    setForm({
      title:       ad.title,
      description: ad.description || '',
      badge:       ad.badge || '',
      badgeColor:  ad.badgeColor || 'blue',
      link:        ad.link === '#' ? '' : (ad.link || '')
    })
    setEditId(ad._id)
    setSelectedFile(null)
    // Prévisualisation = image actuelle depuis l'API
    setPreview(adsService.getImageUrl(ad._id) + '?t=' + Date.now())
    setFormError('')
    setShowForm(true)
  }

  const cancelForm = () => {
    setShowForm(false); setSelectedFile(null); setPreview(null)
    setEditId(null); setFormError('')
  }

  // ── Soumission (création ou édition) ──────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!editId && !selectedFile) { setFormError('Veuillez sélectionner une image'); return }
    if (!form.title.trim()) { setFormError('Le titre est requis'); return }
    setSaving(true)
    try {
      const fd = new FormData()
      if (selectedFile) fd.append('image', selectedFile)
      fd.append('title', form.title)
      fd.append('description', form.description)
      fd.append('badge', form.badge)
      fd.append('badgeColor', form.badgeColor)
      fd.append('link', form.link || '#')

      if (editId) {
        const res = await adsService.updateFull(editId, fd)
        setAds(a => a.map(x => x._id === editId ? res.data.data : x))
      } else {
        const res = await adsService.create(fd)
        setAds(a => [res.data.data, ...a])
      }
      cancelForm()
    } catch (err) {
      setFormError(err.response?.data?.error?.message || 'Erreur lors de la sauvegarde')
    } finally { setSaving(false) }
  }

  // ── Toggle actif/inactif ───────────────────────────────────────────────────
  const toggleActive = async (ad) => {
    try {
      const res = await adsService.update(ad._id, { active: !ad.active })
      setAds(a => a.map(x => x._id === ad._id ? res.data.data : x))
    } catch { setError('Erreur lors de la mise à jour') }
  }

  // ── Suppression ────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    try {
      await adsService.delete(deleteTarget)
      setAds(a => a.filter(x => x._id !== deleteTarget))
    } catch { setError('Erreur lors de la suppression') }
    finally { setDeleteTarget(null) }
  }

  if (loading) return <LoadingSpinner />

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-orange-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 p-6">
      <div className="max-w-4xl mx-auto">

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-amber-500 to-orange-400 p-8 mb-8 shadow-xl shadow-amber-200 dark:shadow-amber-900/30">
          <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2" />
          <div className="relative flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="text-4xl">📢</span>
                <h1 className="text-3xl font-bold text-white">Gestion des publicités</h1>
              </div>
              <p className="text-amber-100 text-sm">
                {ads.filter(a => a.active).length} active{ads.filter(a => a.active).length !== 1 ? 's' : ''} · {ads.length} au total
              </p>
            </div>
            <button onClick={openCreate}
              className="flex items-center gap-2 bg-white text-amber-600 font-semibold px-5 py-3 rounded-2xl shadow-lg hover:shadow-xl hover:scale-105 transition-all text-sm">
              <span className="text-lg">+</span> Ajouter
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl text-red-600 dark:text-red-400 text-sm">{error}</div>
        )}

        {/* ── Formulaire création / édition ──────────────────────────────── */}
        <AnimatePresence>
          {showForm && (
            <motion.div
              initial={{ opacity: 0, scale: 0.97, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: -10 }}
              transition={{ duration: 0.2 }}
              className="mb-6 bg-white dark:bg-slate-800 rounded-3xl shadow-xl border border-gray-100 dark:border-slate-700 overflow-hidden"
            >
              <div className="bg-gradient-to-r from-amber-500 to-orange-400 px-6 py-4">
                <h2 className="text-white font-semibold text-lg">
                  {editId ? '✏️ Modifier la publicité' : '✨ Nouvelle publicité'}
                </h2>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-5">

                {/* Zone image */}
                <div>
                  <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                    Image {editId ? '(laisser vide pour garder l\'image actuelle)' : '*'}
                  </label>
                  <div
                    onDrop={handleDrop}
                    onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                    onDragLeave={() => setDragOver(false)}
                    onClick={() => fileInputRef.current?.click()}
                    className={`relative border-2 border-dashed rounded-2xl cursor-pointer transition-all ${
                      dragOver
                        ? 'border-amber-400 bg-amber-50 dark:bg-amber-900/20 p-6'
                        : preview
                          ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-900/10 p-2'
                          : 'border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 hover:border-amber-300 p-8 text-center'
                    }`}
                  >
                    <input ref={fileInputRef} type="file" accept=".jpg,.jpeg,.png,.webp"
                      className="hidden" onChange={e => handleFileSelect(e.target.files?.[0])} />

                    {preview ? (
                      <div className="relative">
                        <img src={preview} alt="Aperçu"
                          className="w-full h-52 object-contain rounded-xl" />
                        {/* Overlay analyse IA */}
                        {aiLoading && (
                          <div className="absolute inset-0 bg-white/80 dark:bg-slate-800/80 rounded-xl flex flex-col items-center justify-center gap-2">
                            <div className="w-8 h-8 border-3 border-violet-500 border-t-transparent rounded-full animate-spin" />
                            <p className="text-sm font-semibold text-violet-600 dark:text-violet-400">✨ Analyse IA en cours...</p>
                          </div>
                        )}
                        <button type="button"
                          onClick={e => { e.stopPropagation(); setSelectedFile(null); setPreview(editId ? adsService.getImageUrl(editId) + '?t=' + Date.now() : null); setAiLoading(false) }}
                          className="absolute top-2 right-2 w-7 h-7 bg-red-500 text-white rounded-full text-sm hover:bg-red-600 transition-colors flex items-center justify-center">✕</button>
                        {selectedFile && !aiLoading && (
                          <span className="absolute bottom-2 left-2 text-xs bg-emerald-500 text-white px-2 py-0.5 rounded-full">✓ Nouvelle image</span>
                        )}
                        {aiLoading && (
                          <span className="absolute bottom-2 left-2 text-xs bg-violet-500 text-white px-2 py-0.5 rounded-full animate-pulse">🧠 IA analyse...</span>
                        )}
                      </div>
                    ) : (
                      <div>
                        <div className="text-4xl mb-2">🖼️</div>
                        <p className="text-gray-600 dark:text-gray-300 font-medium text-sm">Glisser-déposer ou cliquer pour sélectionner</p>
                        <p className="text-gray-400 text-xs mt-1">JPEG, PNG, WEBP · max 10 Mo</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Titre */}
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Titre du produit *</label>
                    <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                      className="w-full px-4 py-3 rounded-2xl border-2 border-gray-100 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:border-amber-400 transition-colors"
                      placeholder="ex: Primalac Premium" />
                  </div>
                  {/* Description */}
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Description</label>
                    <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                      rows={2} maxLength={300}
                      className="w-full px-4 py-3 rounded-2xl border-2 border-gray-100 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:border-amber-400 transition-colors resize-none"
                      placeholder="ex: Lait infantile enrichi en fer · Qualité Suisse" />
                  </div>
                  {/* Badge */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Badge</label>
                    <input value={form.badge} onChange={e => setForm(f => ({ ...f, badge: e.target.value }))}
                      className="w-full px-4 py-3 rounded-2xl border-2 border-gray-100 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:border-amber-400 transition-colors"
                      placeholder="ex: Nouveau, Recommandé..." />
                  </div>
                  {/* Couleur badge */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Couleur du badge</label>
                    <div className="flex gap-2 mt-2">
                      {BADGE_COLORS.map(c => (
                        <button key={c.value} type="button" onClick={() => setForm(f => ({ ...f, badgeColor: c.value }))}
                          title={c.label}
                          className={`w-8 h-8 rounded-full ${c.bg} transition-all ${form.badgeColor === c.value ? 'ring-2 ring-offset-2 ring-gray-400 scale-110' : 'opacity-60 hover:opacity-100'}`} />
                      ))}
                    </div>
                  </div>
                  {/* Lien */}
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Lien vers le site (optionnel)</label>
                    <input value={form.link} onChange={e => setForm(f => ({ ...f, link: e.target.value }))}
                      className="w-full px-4 py-3 rounded-2xl border-2 border-gray-100 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:border-amber-400 transition-colors"
                      placeholder="https://www.site-produit.com" />
                  </div>
                </div>

                {formError && (
                  <p className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 px-4 py-2 rounded-xl">{formError}</p>
                )}

                <div className="flex gap-3 pt-2">
                  <button type="submit" disabled={saving || aiLoading}
                    className="flex-1 py-3 bg-gradient-to-r from-amber-500 to-orange-400 disabled:opacity-50 text-white font-semibold rounded-2xl hover:shadow-lg hover:scale-[1.02] transition-all">
                    {aiLoading ? '✨ Analyse IA...' : saving ? 'Enregistrement...' : editId ? '💾 Enregistrer les modifications' : '📢 Publier la publicité'}
                  </button>
                  <button type="button" onClick={cancelForm}
                    className="flex-1 py-3 bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 font-semibold rounded-2xl hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors">
                    Annuler
                  </button>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── État vide ───────────────────────────────────────────────────── */}
        {ads.length === 0 && !showForm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="text-center py-20 bg-white dark:bg-slate-800 rounded-3xl border-2 border-dashed border-gray-200 dark:border-slate-700">
            <div className="text-6xl mb-4">📢</div>
            <p className="text-gray-500 dark:text-gray-400 font-medium mb-2">Aucune publicité</p>
            <p className="text-gray-400 text-sm mb-6">Ajoutez votre première publicité produit</p>
            <button onClick={openCreate}
              className="px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-400 text-white font-semibold rounded-2xl hover:shadow-lg transition-all text-sm">
              + Ajouter une publicité
            </button>
          </motion.div>
        )}

        {/* ── Liste ───────────────────────────────────────────────────────── */}
        <div className="space-y-4">
          {ads.map((ad, i) => (
            <motion.div key={ad._id}
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className={`group bg-white dark:bg-slate-800 rounded-2xl border-2 transition-all ${
                ad.active
                  ? 'border-gray-100 dark:border-slate-700 hover:border-amber-200 dark:hover:border-amber-800'
                  : 'border-gray-100 dark:border-slate-700 opacity-60'
              }`}
            >
              <div className="flex items-center gap-4 p-4">
                {/* Image */}
                <div className="w-24 h-20 rounded-xl overflow-hidden bg-gray-100 dark:bg-slate-700 shrink-0 shadow-sm">
                  <img
                    src={adsService.getImageUrl(ad._id) + '?t=' + ad.updatedAt}
                    alt={ad.title}
                    className="w-full h-full object-cover"
                    onError={e => { e.target.style.display = 'none' }}
                  />
                </div>

                {/* Infos */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h3 className="font-bold text-gray-800 dark:text-gray-100 text-sm">{ad.title}</h3>
                    {ad.badge && (
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium bg-${ad.badgeColor}-100 text-${ad.badgeColor}-700 dark:bg-${ad.badgeColor}-900/30 dark:text-${ad.badgeColor}-400`}>
                        {ad.badge}
                      </span>
                    )}
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${ad.active ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-gray-100 text-gray-500 dark:bg-slate-700 dark:text-gray-400'}`}>
                      {ad.active ? '● Active' : '○ Inactive'}
                    </span>
                  </div>
                  {ad.description && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{ad.description}</p>
                  )}
                  {ad.link && ad.link !== '#' && (
                    <a href={ad.link} target="_blank" rel="noopener noreferrer"
                      className="text-xs text-blue-500 hover:underline truncate block mt-0.5">{ad.link}</a>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => openEdit(ad)}
                    className="p-2.5 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 rounded-xl hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors text-sm"
                    title="Modifier">
                    ✏️
                  </button>
                  <button onClick={() => toggleActive(ad)}
                    className={`p-2.5 rounded-xl transition-colors text-sm ${
                      ad.active
                        ? 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200'
                        : 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 hover:bg-emerald-100'
                    }`}
                    title={ad.active ? 'Désactiver' : 'Activer'}>
                    {ad.active ? '⏸' : '▶'}
                  </button>
                  <button onClick={() => setDeleteTarget(ad._id)}
                    className="p-2.5 bg-red-50 dark:bg-red-900/20 text-red-500 rounded-xl hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors text-sm"
                    title="Supprimer">
                    🗑️
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

      </div>

      <ConfirmModal
        isOpen={!!deleteTarget}
        message="Supprimer cette publicité ? L'image sera définitivement effacée."
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        danger
      />
    </div>
  )
}
