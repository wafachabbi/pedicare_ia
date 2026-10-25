const crypto = require('crypto')
const mongoose = require('mongoose')
const Groq = require('groq-sdk')
const ConsultationSheet = require('../models/ConsultationSheet')
const ConsultationQuestion = require('../models/ConsultationQuestion')
const Child = require('../models/Child')
const Vaccination = require('../models/Vaccination')
const Measurement = require('../models/Measurement')
const Appointment = require('../models/Appointment')

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

// Mêmes modèles que ai.controller.js
const PREFERRED_MODEL = 'qwen/qwen3.8-27b'
const FALLBACK_MODEL  = 'allam-2-7b'

const PRIORITY_RANK = { haute: 0, normale: 1, basse: 2 }
const GENDER_LABEL = { M: 'masculin', F: 'féminin', other: 'autre' }

const SYSTEM_PROMPT = `Tu es un assistant pédiatrique. Tu rédiges en français une fiche de préparation de consultation destinée au pédiatre, à partir des données anonymisées fournies.
Règles strictes :
- Ne JAMAIS poser de diagnostic ni prescrire de traitement ou de médicament.
- N'invente aucune donnée absente de l'entrée.
- Réponds UNIQUEMENT avec un objet JSON valide, sans texte avant ou après, avec exactement ces clés :
{"resume":"3 phrases maximum","motifs":["motif de consultation"],"antecedents":["vaccinations, allergies, mesures pertinentes"],"questionsParent":["questions du parent reformulées clairement, triées par priorité décroissante"],"pointsAttention":["éléments à vérifier pendant la consultation"]}
Utilise un tableau vide si une section n'a pas de contenu.`

const AI_ERROR = { code: 'AI_ERROR', message: 'La génération de la fiche a échoué, réessayez' }

// ─── Nettoyage réponse Qwen (supprime balises <think>) ──────────────────────
function cleanResponse(text) {
  return text.replace(/<think>[\s\S]*?<\/think>/gi, '').trim()
}

const ownsChild = async (childId, userId) => {
  return Child.findOne({ _id: childId, parentId: userId })
}

// Erreurs Mongoose → réponses 400 / 404, le reste au errorHandler
const handleError = (err, res, next) => {
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map(e => e.message).join(', ')
    return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message } })
  }
  if (err.name === 'CastError') {
    return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Ressource introuvable' } })
  }
  next(err)
}

const notFound = (res, message) =>
  res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message } })

// ─── Anonymisation ──────────────────────────────────────────────────────────
const computeAge = (dateOfBirth) => {
  const now = new Date()
  const dob = new Date(dateOfBirth)
  let months = (now.getFullYear() - dob.getFullYear()) * 12 + (now.getMonth() - dob.getMonth())
  if (now.getDate() < dob.getDate()) months--
  return months < 24 ? `${months} mois` : `${Math.floor(months / 12)} ans`
}

const monthYear = (date) => {
  const d = new Date(date)
  return `${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
}

const isoDate = (date) => new Date(date).toISOString().slice(0, 10)

// Remplace le prénom de l'enfant dans les textes libres saisis par le parent
const maskFirstName = (text, firstName) => {
  if (!text || !firstName) return text || ''
  const escaped = firstName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return text.replace(new RegExp(`(?<!\\p{L})${escaped}(?!\\p{L})`, 'giu'), "l'enfant")
}

// Aucun prénom, aucune date de naissance exacte, aucun id
const buildAnonymizedInput = (child, { vaccinations, measurement, appointment, questions }) => ({
  age: computeAge(child.dateOfBirth),
  sexe: GENDER_LABEL[child.gender] || 'inconnu',
  groupeSanguin: child.bloodType || 'Inconnu',
  allergies: maskFirstName(child.allergies, child.firstName) || 'Aucune connue',
  vaccinations: vaccinations.map(v => ({ nom: v.vaccineName, date: monthYear(v.administeredAt) })),
  derniereMesure: measurement
    ? {
        poidsKg: measurement.weight ?? null,
        tailleCm: measurement.height ?? null,
        perimetreCranienCm: measurement.headCircumference ?? null,
        date: isoDate(measurement.date)
      }
    : null,
  prochainRdv: appointment
    ? { type: appointment.type === 'exam' ? 'examen' : 'consultation', date: isoDate(appointment.dateTime) }
    : null,
  questionsEnAttente: questions.map(q => ({
    texte: maskFirstName(q.question, child.firstName),
    categorie: q.category,
    priorite: q.priority
  }))
})

// ─── Appel Groq ─────────────────────────────────────────────────────────────
async function createCompletion(model, input, jsonMode) {
  return groq.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: `Données de l'enfant (JSON) :\n${JSON.stringify(input, null, 2)}` }
    ],
    temperature: 0.3,
    max_tokens: 700,
    ...(jsonMode && { response_format: { type: 'json_object' } })
  })
}

// Mode JSON d'abord ; 400 → modèle sans response_format ; 404/503 → modèle de secours
async function callModel(model, input) {
  try {
    return await createCompletion(model, input, true)
  } catch (err) {
    if (err.status === 400) return createCompletion(model, input, false)
    throw err
  }
}

async function generateWithGroq(input) {
  const start = Date.now()
  let model = PREFERRED_MODEL
  let res
  try {
    res = await callModel(model, input)
  } catch (err) {
    if (err.status !== 404 && err.status !== 503) throw err
    model = FALLBACK_MODEL
    res = await callModel(model, input)
  }
  return {
    raw: cleanResponse(res.choices[0]?.message?.content || ''),
    meta: {
      model,
      latencyMs: Date.now() - start,
      promptTokens: res.usage?.prompt_tokens ?? null,
      completionTokens: res.usage?.completion_tokens ?? null
    }
  }
}

const toStringArray = (value) =>
  Array.isArray(value) ? value.filter(v => typeof v === 'string' && v.trim()).map(v => v.trim()).slice(0, 15) : []

// Parse + normalise la réponse ; null si inexploitable
function parseSheet(raw) {
  let parsed
  try {
    parsed = JSON.parse(raw)
  } catch {
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return null
    try { parsed = JSON.parse(jsonMatch[0]) } catch { return null }
  }
  if (!parsed || typeof parsed.resume !== 'string' || !parsed.resume.trim()) return null
  return {
    resume: parsed.resume.trim(),
    motifs: toStringArray(parsed.motifs),
    antecedents: toStringArray(parsed.antecedents),
    questionsParent: toStringArray(parsed.questionsParent),
    pointsAttention: toStringArray(parsed.pointsAttention)
  }
}

// ─── POST /api/consultation-sheets/children/:childId ────────────────────────
const generateSheet = async (req, res, next) => {
  try {
    const child = await ownsChild(req.params.childId, req.user.id)
    if (!child) return notFound(res, 'Enfant introuvable')

    // RDV ciblé : celui du body (doit appartenir à l'enfant) ou le prochain à venir
    let appointment = null
    if (req.body?.appointmentId) {
      if (mongoose.isValidObjectId(req.body.appointmentId)) {
        appointment = await Appointment.findOne({ _id: req.body.appointmentId, childId: child._id }).lean()
      }
      if (!appointment) {
        return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Rendez-vous invalide pour cet enfant' } })
      }
    } else {
      appointment = await Appointment.findOne({ childId: child._id, status: 'upcoming', dateTime: { $gte: new Date() } })
        .sort({ dateTime: 1 })
        .lean()
    }

    const [vaccinations, measurement, questions] = await Promise.all([
      Vaccination.find({ childId: child._id }).sort({ administeredAt: -1 }).limit(10).lean(),
      Measurement.findOne({ childId: child._id }).sort({ date: -1 }).lean(),
      ConsultationQuestion.find({ childId: child._id, status: 'en_attente' }).sort({ createdAt: -1 }).lean()
    ])
    questions.sort((a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority])

    const input = buildAnonymizedInput(child, { vaccinations, measurement, appointment, questions })
    const inputHash = crypto.createHash('sha256').update(JSON.stringify(input)).digest('hex')
    const appointmentId = appointment?._id || null

    // Même entrée (et même RDV) → fiche existante, sans rappeler le LLM
    const existing = await ConsultationSheet.findOne({ childId: child._id, appointmentId, 'meta.inputHash': inputHash })
      .sort({ createdAt: -1 })
      .lean()
    if (existing) {
      return res.json({ success: true, data: { ...existing, meta: { ...existing.meta, fromCache: true } } })
    }

    let content, meta
    try {
      const result = await generateWithGroq(input)
      content = parseSheet(result.raw)
      meta = result.meta
    } catch (err) {
      // Log serveur uniquement : jamais l'erreur brute ni la clé côté client
      console.error('Erreur Groq fiche consultation:', err.status || '', err.name)
      return res.status(502).json({ success: false, error: AI_ERROR })
    }
    if (!content) return res.status(502).json({ success: false, error: AI_ERROR })

    const sheet = await ConsultationSheet.create({
      parentId: req.user.id,
      childId: child._id,
      appointmentId,
      pediatreId: appointment?.pediatreId || null,
      content,
      meta: { ...meta, fromCache: false, inputHash }
    })
    res.status(201).json({ success: true, data: sheet })
  } catch (err) { handleError(err, res, next) }
}

// ─── GET /api/consultation-sheets/children/:childId ─────────────────────────
const getChildSheets = async (req, res, next) => {
  try {
    if (!await ownsChild(req.params.childId, req.user.id)) return notFound(res, 'Enfant introuvable')
    const sheets = await ConsultationSheet.find({ childId: req.params.childId, parentId: req.user.id })
      .sort({ createdAt: -1 })
      .lean()
    res.json({ success: true, data: sheets })
  } catch (err) { handleError(err, res, next) }
}

// ─── GET /api/consultation-sheets/shared ────────────────────────────────────
// Le prénom est affiché au pédiatre mais n'a jamais été envoyé au LLM
const getMySharedSheets = async (req, res, next) => {
  try {
    const sheets = await ConsultationSheet.find({ pediatreId: req.user.id, status: 'partagee' })
      .populate({ path: 'childId', select: 'firstName dateOfBirth gender' })
      .populate({ path: 'appointmentId', select: 'type dateTime' })
      .sort({ createdAt: -1 })
      .lean()
    res.json({ success: true, data: sheets })
  } catch (err) { handleError(err, res, next) }
}

// ─── GET /api/consultation-sheets/:id ───────────────────────────────────────
const getSheet = async (req, res, next) => {
  try {
    // Parent propriétaire ou pédiatre destinataire uniquement
    const filter = req.user.role === 'pediatre'
      ? { _id: req.params.id, pediatreId: req.user.id, status: 'partagee' }
      : { _id: req.params.id, parentId: req.user.id }
    const sheet = await ConsultationSheet.findOne(filter)
      .populate({ path: 'childId', select: 'firstName dateOfBirth gender' })
      .populate({ path: 'appointmentId', select: 'type dateTime' })
      .lean()
    if (!sheet) return notFound(res, 'Fiche introuvable')
    res.json({ success: true, data: sheet })
  } catch (err) { handleError(err, res, next) }
}

// ─── DELETE /api/consultation-sheets/:id ────────────────────────────────────
const deleteSheet = async (req, res, next) => {
  try {
    const sheet = await ConsultationSheet.findOneAndDelete({ _id: req.params.id, parentId: req.user.id })
    if (!sheet) return notFound(res, 'Fiche introuvable')
    res.json({ success: true, message: 'Fiche supprimée' })
  } catch (err) { handleError(err, res, next) }
}

module.exports = { buildAnonymizedInput, generateSheet, getChildSheets, getMySharedSheets, getSheet, deleteSheet }
