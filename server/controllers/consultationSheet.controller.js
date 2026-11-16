const crypto = require('crypto')
const path = require('path')
const mongoose = require('mongoose')
const Groq = require('groq-sdk')
const ConsultationSheet = require('../models/ConsultationSheet')
const ConsultationQuestion = require('../models/ConsultationQuestion')
const Child = require('../models/Child')
const Vaccination = require('../models/Vaccination')
const Measurement = require('../models/Measurement')
const Appointment = require('../models/Appointment')
const { RagIndex, ragVaccins, ragCroissance } = require('../services/rag.service')

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
- Appuie-toi sur les documents de référence fournis quand ils sont pertinents ; n'invente aucune recommandation absente des documents ; ne fais jamais de diagnostic.
- Réponds UNIQUEMENT avec un objet JSON valide, sans texte avant ou après, avec exactement ces clés :
{"resume":"3 phrases maximum","motifs":["motif de consultation"],"antecedents":["vaccinations, allergies, mesures pertinentes"],"questionsParent":["questions du parent reformulées clairement, triées par priorité décroissante"],"pointsAttention":["éléments à vérifier pendant la consultation"],"sources":["titres exacts des documents de référence réellement utilisés"]}
Utilise un tableau vide si une section n'a pas de contenu.`

const AI_ERROR = { code: 'AI_ERROR', message: 'La génération de la fiche a échoué, réessayez' }

// ─── RAG multi-sources ──────────────────────────────────────────────────────
// Index local des conseils de consultation ; si le chargement échoue, la fiche fonctionne sans
let ragConsultation = null
try {
  ragConsultation = new RagIndex('Conseils consultation').loadFromFile(path.join(__dirname, '../data/rag-consultation.json'))
} catch (err) {
  console.error('⚠️  Erreur chargement index RAG consultation :', err.message)
}

// Pruning : documents sous ce score cosinus écartés, puis quota de documents par base
const RAG_MIN_SCORE = 0.1
const RAG_QUOTAS = { consultation: 2, vaccins: 1, croissance: 1 }

const MEASURE_LABEL = { weight: 'poids', height: 'taille', headCircumference: 'périmètre crânien' }
const SEX_LABEL = { M: 'garçons', F: 'filles' }

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
const ageInMonths = (dateOfBirth) => {
  const now = new Date()
  const dob = new Date(dateOfBirth)
  let months = (now.getFullYear() - dob.getFullYear()) * 12 + (now.getMonth() - dob.getMonth())
  if (now.getDate() < dob.getDate()) months--
  return months
}

const computeAge = (dateOfBirth) => {
  const months = ageInMonths(dateOfBirth)
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
  allergies: maskFirstName([].concat(child.allergies || []).join(', '), child.firstName) || 'Aucune connue',
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

// ─── Récupération RAG ───────────────────────────────────────────────────────
// Un index absent ou non construit ne bloque jamais la fiche
const safeRetrieve = (index, query, topK, filters) => {
  if (!index?.built || !query.trim()) return []
  try {
    return index.retrieve(query, topK, filters).map(doc => ({ ...doc, base: index.name }))
  } catch {
    return []
  }
}

// Par groupe [{ docs, quota }] : retire les documents sous le seuil, garde les `quota` meilleurs.
// L'ordre des groupes est conservé : c'est l'ordre d'injection dans le prompt.
const pruneDocs = (groups) => {
  let total = 0
  const kept = []
  for (const { docs, quota } of groups) {
    total += docs.length
    kept.push(...docs
      .filter(d => d.score >= RAG_MIN_SCORE)
      .sort((a, b) => b.score - a.score)
      .slice(0, quota))
  }
  return { docs: kept, pruned: total - kept.length }
}

// Requêtes construites uniquement à partir de l'entrée anonymisée (jamais le prénom).
// Ordre d'injection : conseils liés aux questions du parent, puis vaccins, puis croissance.
function retrieveContext(input, child) {
  const ageMonths = ageInMonths(child.dateOfBirth)
  const questionsText = input.questionsEnAttente.map(q => q.texte).join(' ')

  let croissanceDocs = []
  const m = input.derniereMesure
  const mesure = m && (m.poidsKg != null ? 'weight' : m.tailleCm != null ? 'height' : m.perimetreCranienCm != null ? 'headCircumference' : null)
  if (mesure) {
    const sexe = SEX_LABEL[child.gender] ? child.gender : undefined
    const query = `poids taille percentile ${MEASURE_LABEL[mesure]} ${SEX_LABEL[sexe] || ''} ${ageMonths} mois`
    croissanceDocs = safeRetrieve(ragCroissance, query, 2, { sexe, mesure })
  }

  return pruneDocs([
    { docs: safeRetrieve(ragConsultation, questionsText, 3, { ageMonths }), quota: RAG_QUOTAS.consultation },
    { docs: safeRetrieve(ragVaccins, `vaccins recommandés ${input.age}`, 2, { ageMonths }), quota: RAG_QUOTAS.vaccins },
    { docs: croissanceDocs, quota: RAG_QUOTAS.croissance }
  ])
}

const buildUserMessage = (input, docs) => {
  let message = `Données de l'enfant (JSON) :\n${JSON.stringify(input, null, 2)}`
  if (docs.length) {
    message += '\n\nDOCUMENTS DE RÉFÉRENCE (informations générales, à utiliser seulement si pertinentes) :\n'
    message += docs.map(d => `📄 ${d.title} [${d.base}]\n${d.content}`).join('\n\n')
  }
  return message
}

// ─── Appel Groq ─────────────────────────────────────────────────────────────
async function createCompletion(model, userMessage, jsonMode) {
  return groq.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userMessage }
    ],
    temperature: 0.3,
    max_tokens: 700,
    ...(jsonMode && { response_format: { type: 'json_object' } })
  })
}

// Mode JSON d'abord ; 400 → modèle sans response_format ; 404/503 → modèle de secours
async function callModel(model, userMessage) {
  try {
    return await createCompletion(model, userMessage, true)
  } catch (err) {
    if (err.status === 400) return createCompletion(model, userMessage, false)
    throw err
  }
}

async function generateWithGroq(userMessage) {
  const start = Date.now()
  let model = PREFERRED_MODEL
  let res
  try {
    res = await callModel(model, userMessage)
  } catch (err) {
    if (err.status !== 404 && err.status !== 503) throw err
    model = FALLBACK_MODEL
    res = await callModel(model, userMessage)
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

// Parse + normalise la réponse ; null si inexploitable.
// Seules les sources correspondant à un document réellement fourni sont conservées.
function parseSheet(raw, docTitles = []) {
  let parsed
  try {
    parsed = JSON.parse(raw)
  } catch {
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return null
    try { parsed = JSON.parse(jsonMatch[0]) } catch { return null }
  }
  if (!parsed || typeof parsed.resume !== 'string' || !parsed.resume.trim()) return null
  const sheet = {
    resume: parsed.resume.trim(),
    motifs: toStringArray(parsed.motifs),
    antecedents: toStringArray(parsed.antecedents),
    questionsParent: toStringArray(parsed.questionsParent),
    pointsAttention: toStringArray(parsed.pointsAttention)
  }
  const sources = toStringArray(parsed.sources).filter(title => docTitles.includes(title))
  if (sources.length) sheet.sources = sources
  return sheet
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
    const { docs: ragDocs, pruned: ragPruned } = retrieveContext(input, child)
    // Les documents récupérés font partie de l'entrée : un changement de corpus invalide le cache
    const inputHash = crypto.createHash('sha256')
      .update(JSON.stringify({ input, ragDocIds: ragDocs.map(d => d.id) }))
      .digest('hex')
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
      const result = await generateWithGroq(buildUserMessage(input, ragDocs))
      content = parseSheet(result.raw, ragDocs.map(d => d.title))
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
      meta: {
        ...meta,
        fromCache: false,
        inputHash,
        ragDocsUsed: ragDocs.length,
        ragPruned,
        ragSources: ragDocs.map(d => ({ title: d.title, score: Math.round(d.score * 1000) / 1000, base: d.base }))
      }
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

module.exports = { buildAnonymizedInput, retrieveContext, pruneDocs, RAG_MIN_SCORE, RAG_QUOTAS, generateSheet, getChildSheets, getMySharedSheets, getSheet, deleteSheet }
