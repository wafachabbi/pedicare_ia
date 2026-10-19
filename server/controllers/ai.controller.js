const Groq = require('groq-sdk')
const Child = require('../models/Child')
const Vaccination = require('../models/Vaccination')
const Appointment = require('../models/Appointment')

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

// ─── Cache simple en mémoire (réduit coût et latence) ───────────────────────
const cache = new Map()
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

function getCache(key) {
  const entry = cache.get(key)
  if (!entry) return null
  if (Date.now() - entry.ts > CACHE_TTL) { cache.delete(key); return null }
  return entry.data
}
function setCache(key, data) {
  cache.set(key, { data, ts: Date.now() })
}

// ─── Nettoyage réponse Qwen (supprime balises <think>) ──────────────────────
function cleanResponse(text) {
  return text.replace(/<think>[\s\S]*?<\/think>/gi, '').trim()
}

// ─── Modèles disponibles par ordre de préférence ────────────────────────────
// Choix justifié : qwen/qwen3.8-27b = meilleur modèle chat disponible sur
// cette clé Groq gratuite. LLaMA 3.1 n'est pas accessible sur le tier free.
// Temperature 0.3-0.4 = équilibre entre créativité et précision médicale.
const PREFERRED_MODEL = 'qwen/qwen3.8-27b'
const FALLBACK_MODEL  = 'allam-2-7b'

async function callGroq(prompt, maxTokens = 500, temperature = 0.4) {
  try {
    const res = await groq.chat.completions.create({
      model: PREFERRED_MODEL,
      messages: [{ role: 'user', content: prompt }],
      temperature,
      max_tokens: maxTokens
    })
    return cleanResponse(res.choices[0]?.message?.content || '')
  } catch (err) {
    // Fallback sur modèle alternatif si le principal échoue
    if (err.status === 404 || err.status === 503) {
      const res = await groq.chat.completions.create({
        model: FALLBACK_MODEL,
        messages: [{ role: 'user', content: prompt }],
        temperature,
        max_tokens: maxTokens
      })
      return cleanResponse(res.choices[0]?.message?.content || '')
    }
    throw err
  }
}

// ─── Vérifie ownership ──────────────────────────────────────────────────────
const ownsChild = async (childId, userId) => {
  return Child.findOne({ _id: childId, parentId: userId })
}

// ─── POST /api/ai/summary/:childId ──────────────────────────────────────────
const generateSummary = async (req, res, next) => {
  try {
    const child = await ownsChild(req.params.childId, req.user.id)
    if (!child) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Enfant introuvable' } })

    // Cache check
    const cacheKey = `summary_${child._id}`
    const cached = getCache(cacheKey)
    if (cached) return res.json({ success: true, data: cached, fromCache: true })

    const [vaccinations, appointments] = await Promise.all([
      Vaccination.find({ childId: child._id }).sort({ administeredAt: -1 }).lean(),
      Appointment.find({ childId: child._id }).sort({ dateTime: -1 }).lean()
    ])

    const now = new Date()
    const ageMonths = Math.floor((now - new Date(child.dateOfBirth)) / (1000 * 60 * 60 * 24 * 30))
    const age = ageMonths < 24 ? `${ageMonths} mois` : `${Math.floor(ageMonths / 12)} ans`

    // Prompt optimisé — instructions claires, rôle défini, format attendu
    const prompt = `Tu es un assistant médical pédiatrique expert. Génère un résumé clair en français du dossier de santé de cet enfant.

DONNÉES PATIENT :
- Prénom : ${child.firstName}
- Âge : ${age}
- Sexe : ${child.gender === 'F' ? 'Féminin' : 'Masculin'}
- Groupe sanguin : ${child.bloodType || 'Inconnu'}
- Allergies connues : ${child.allergies || 'Aucune'}

VACCINATIONS (${vaccinations.length}) :
${vaccinations.length === 0 ? 'Aucune vaccination enregistrée.' : vaccinations.slice(0, 10).map(v => `• ${v.vaccineName} — ${new Date(v.administeredAt).toLocaleDateString('fr-FR')}`).join('\n')}

RENDEZ-VOUS (${appointments.length}) :
${appointments.length === 0 ? 'Aucun.' : appointments.slice(0, 5).map(a => `• ${a.type === 'exam' ? 'Examen' : 'Consultation'} — ${new Date(a.dateTime).toLocaleDateString('fr-FR')} (${a.status === 'upcoming' ? 'à venir' : 'passé'})${a.practitioner ? ' avec ' + a.practitioner : ''}`).join('\n')}

INSTRUCTIONS :
Rédige un résumé structuré avec exactement ces 4 sections :
1. **Aperçu général** (2-3 phrases sur l'état de santé global)
2. **Statut vaccinal** (évaluation du suivi vaccinal)
3. **Points d'attention** (éléments importants à surveiller)
4. **Recommandation** (conseil pratique pour les parents)

Maximum 180 mots. Ton professionnel mais accessible. Ne jamais diagnostiquer.`

    const summary = await callGroq(prompt, 400, 0.4)
    const result = { summary, childName: child.firstName, model: PREFERRED_MODEL }
    setCache(cacheKey, result)

    res.json({ success: true, data: result })
  } catch (err) { next(err) }
}

// ─── POST /api/ai/reminders/:childId ────────────────────────────────────────
const generateReminders = async (req, res, next) => {
  try {
    const child = await ownsChild(req.params.childId, req.user.id)
    if (!child) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Enfant introuvable' } })

    // Cache check
    const cacheKey = `reminders_${child._id}`
    const cached = getCache(cacheKey)
    if (cached) return res.json({ success: true, data: cached, fromCache: true })

    const [vaccinations, appointments] = await Promise.all([
      Vaccination.find({ childId: child._id }).sort({ administeredAt: -1 }).lean(),
      Appointment.find({ childId: child._id, status: 'upcoming' }).sort({ dateTime: 1 }).lean()
    ])

    const now = new Date()
    const ageMonths = Math.floor((now - new Date(child.dateOfBirth)) / (1000 * 60 * 60 * 24 * 30))
    const age = ageMonths < 24 ? `${ageMonths} mois` : `${Math.floor(ageMonths / 12)} ans`

    // Prompt structuré pour forcer un JSON valide
    const prompt = `Tu es un assistant médical pédiatrique. Analyse ce dossier et génère des rappels de santé en français.

PATIENT : ${child.firstName}, ${age}, ${child.gender === 'F' ? 'Fille' : 'Garçon'}
Allergies : ${child.allergies || 'Aucune'}
Vaccins reçus : ${vaccinations.length > 0 ? vaccinations.map(v => v.vaccineName).join(', ') : 'Aucun'}
Rendez-vous à venir : ${appointments.length > 0 ? appointments.map(a => `${a.type} le ${new Date(a.dateTime).toLocaleDateString('fr-FR')}`).join(', ') : 'Aucun'}

CALENDRIER VACCINAL FRANÇAIS :
- 2 mois : DTCaP-Hib-HepB, Pneumocoque
- 4 mois : DTCaP-Hib-HepB, Pneumocoque
- 5 mois : Méningocoque C
- 11 mois : DTCaP-Hib-HepB, Pneumocoque
- 12 mois : ROR, Méningocoque C
- 16-18 mois : ROR (2ème dose)
- 6 ans : DTCaP
- 11-13 ans : DTCaP, HPV (filles)

INSTRUCTIONS : Réponds UNIQUEMENT avec ce JSON valide (sans texte avant/après, sans balises) :
{"reminders":[{"type":"urgent|warning|info","title":"string","message":"string","action":"string"}]}

Maximum 4 rappels pertinents selon l'âge. Types : urgent=vaccin manquant critique, warning=attention requise, info=information utile.`

    const raw = await callGroq(prompt, 600, 0.2)

    let reminders = []
    try {
      // Extraction robuste du JSON
      const jsonMatch = raw.match(/\{[\s\S]*"reminders"[\s\S]*\}/)
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0])
        reminders = (parsed.reminders || []).slice(0, 5)
      }
    } catch {
      reminders = [{
        type: 'info',
        title: 'Suivi pédiatrique recommandé',
        message: `Assurez-vous de consulter régulièrement le pédiatre de ${child.firstName} pour un suivi adapté à son âge.`,
        action: 'Prendre rendez-vous avec le pédiatre'
      }]
    }

    const result = { reminders, childName: child.firstName, model: PREFERRED_MODEL }
    setCache(cacheKey, result)

    res.json({ success: true, data: result })
  } catch (err) { next(err) }
}

// ─── GET /api/ai/models — liste des modèles disponibles (pour documentation) ─
const listModels = async (req, res, next) => {
  try {
    const models = await groq.models.list()
    const chatModels = models.data.filter(m =>
      !m.id.includes('whisper') && !m.id.includes('guard')
    )
    res.json({ success: true, data: chatModels.map(m => ({ id: m.id, created: m.created })) })
  } catch (err) { next(err) }
}

module.exports = { generateSummary, generateReminders, listModels }
