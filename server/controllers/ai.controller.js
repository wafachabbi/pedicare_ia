const Groq = require('groq-sdk')
const Child = require('../models/Child')
const Vaccination = require('../models/Vaccination')
const Appointment = require('../models/Appointment')
const Measurement = require('../models/Measurement')
const Milestone = require('../models/Milestone')
const MedicalRecord = require('../models/MedicalRecord')
const JournalEntry = require('../models/JournalEntry')
const { canAccessChild } = require('../services/childAccess')
const { anonymize } = require('../services/anonymize')

// Instanciation lazy pour éviter le crash au démarrage si la clé est absente
let _groq = null
function getGroq() {
  if (!_groq) _groq = new Groq({ apiKey: process.env.GROQ_API_KEY || 'missing' })
  return _groq
}
const groq = new Proxy({}, {
  get(_, prop) { return getGroq()[prop] }
})

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

// ─── POST /api/ai/growth/:childId ───────────────────────────────────────────
const analyzeGrowth = async (req, res, next) => {
  try {
    const child = await ownsChild(req.params.childId, req.user.id)
    if (!child) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Enfant introuvable' } })

    // Cache check
    const cacheKey = `growth_${child._id}`
    const cached = getCache(cacheKey)
    if (cached) return res.json({ success: true, data: cached, fromCache: true })

    const measurements = await Measurement.find({ childId: child._id }).sort({ date: 1 }).lean()

    if (measurements.length === 0) {
      return res.status(400).json({ success: false, error: { code: 'NO_DATA', message: 'Aucune mesure enregistrée pour cet enfant' } })
    }

    const now = new Date()
    const ageMonths = Math.floor((now - new Date(child.dateOfBirth)) / (1000 * 60 * 60 * 24 * 30))
    const age = ageMonths < 24 ? `${ageMonths} mois` : `${Math.floor(ageMonths / 12)} ans et ${ageMonths % 12} mois`

    // Dernière mesure pour les valeurs actuelles
    const latest = measurements[measurements.length - 1]
    const first = measurements[0]

    // Calcul des variations
    const weightData = measurements.filter(m => m.weight).map(m => ({ date: new Date(m.date).toLocaleDateString('fr-FR'), val: m.weight }))
    const heightData = measurements.filter(m => m.height).map(m => ({ date: new Date(m.date).toLocaleDateString('fr-FR'), val: m.height }))
    const headData   = measurements.filter(m => m.headCircumference).map(m => ({ date: new Date(m.date).toLocaleDateString('fr-FR'), val: m.headCircumference }))

    const prompt = `Tu es un pédiatre expert en croissance infantile. Analyse les données de croissance de cet enfant et fournis une évaluation clinique détaillée en français.

DONNÉES PATIENT :
- Prénom : ${child.firstName}
- Âge : ${age}
- Sexe : ${child.gender === 'F' ? 'Féminin' : 'Masculin'}
- Nombre de mesures enregistrées : ${measurements.length} (du ${new Date(first.date).toLocaleDateString('fr-FR')} au ${new Date(latest.date).toLocaleDateString('fr-FR')})

COURBE DE POIDS (kg) :
${weightData.length > 0 ? weightData.map(d => `• ${d.date} : ${d.val} kg`).join('\n') : 'Aucune donnée de poids'}

COURBE DE TAILLE (cm) :
${heightData.length > 0 ? heightData.map(d => `• ${d.date} : ${d.val} cm`).join('\n') : 'Aucune donnée de taille'}

PÉRIMÈTRE CRÂNIEN (cm) :
${headData.length > 0 ? headData.map(d => `• ${d.date} : ${d.val} cm`).join('\n') : 'Aucune donnée de périmètre crânien'}

VALEURS ACTUELLES (dernière mesure) :
${latest.weight ? `- Poids : ${latest.weight} kg` : ''}
${latest.height ? `- Taille : ${latest.height} cm` : ''}
${latest.headCircumference ? `- Périmètre crânien : ${latest.headCircumference} cm` : ''}
${latest.weight && latest.height ? `- IMC calculé : ${(latest.weight / ((latest.height / 100) ** 2)).toFixed(1)} kg/m²` : ''}

INSTRUCTIONS :
Fournis une analyse structurée avec exactement ces 4 sections :
1. **Tendance générale** (description de l'évolution globale des courbes)
2. **Évaluation par indicateur** (analyse poids, taille, PC séparément avec les percentiles estimés selon les courbes OMS pour l'âge et le sexe)
3. **Points de vigilance** (anomalies, cassures de courbe, stagnations ou progressions trop rapides à surveiller)
4. **Recommandations** (conseils pratiques adaptés à l'âge, fréquence de suivi suggérée)

Ton : professionnel, bienveillant et accessible aux parents. Maximum 250 mots. Ne jamais établir de diagnostic.`

    const analysis = await callGroq(prompt, 600, 0.3)

    const result = {
      analysis,
      childName: child.firstName,
      measurementCount: measurements.length,
      latestMeasurement: {
        date: latest.date,
        weight: latest.weight,
        height: latest.height,
        headCircumference: latest.headCircumference
      },
      model: PREFERRED_MODEL
    }
    setCache(cacheKey, result)

    res.json({ success: true, data: result })
  } catch (err) { next(err) }
}

// ─── POST /api/ai/analyze-image — génère titre/description depuis le nom du fichier ─
const analyzeImage = async (req, res, next) => {
  try {
    const { filename } = req.body
    if (!filename) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'filename requis' } })
    }

    // Nettoyer le nom de fichier pour en extraire le nom du produit
    const productHint = filename
      .replace(/\.[^.]+$/, '')           // enlever l'extension
      .replace(/[-_]/g, ' ')             // tirets/underscores → espaces
      .replace(/\d+/g, '')               // enlever les chiffres isolés
      .trim()

    const prompt = `Tu es un expert en marketing de produits médicaux et pharmaceutiques.
À partir du nom de produit suivant : "${productHint}", génère une fiche publicitaire en français.

INSTRUCTIONS :
Réponds UNIQUEMENT avec ce JSON valide (sans texte avant/après, sans balises markdown) :
{"title":"Nom commercial du produit","description":"Description courte et attractive en 1-2 phrases (bénéfices principaux, max 120 caractères)","badge":"Un mot parmi : Nouveau, Recommandé, Promo, Populaire, Premium, Essentiel","badgeColor":"Une couleur parmi : blue, rose, emerald, orange, violet"}

Règles :
- title : capitalise correctement le nom du produit
- description : mets en avant les bénéfices santé adaptés au type de produit
- badge et badgeColor : les plus appropriés au produit médical`

    const result_raw = await callGroq(prompt, 200, 0.3)
    const jsonMatch = result_raw.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return res.status(500).json({ success: false, error: { code: 'PARSE_ERROR', message: 'Impossible d\'analyser la réponse IA' } })
    }
    const result = JSON.parse(jsonMatch[0])
    res.json({ success: true, data: result })
  } catch (err) { next(err) }
}

// Parent (ses enfants) ou pédiatre (enfants qu'il suit) — renvoie l'enfant ou null
const getAccessibleChild = async (childId, user) => {
  if (!await canAccessChild(childId, user)) return null
  return Child.findById(childId)
}

// ─── Helpers âge ─────────────────────────────────────────────────────────────
function ageInMonths(dateOfBirth) {
  return Math.floor((Date.now() - new Date(dateOfBirth)) / (1000 * 60 * 60 * 24 * 30))
}
function formatAge(ageMonths) {
  return ageMonths < 24 ? `${ageMonths} mois` : `${Math.floor(ageMonths / 12)} ans et ${ageMonths % 12} mois`
}

const MILESTONE_CATEGORIES = ['Motricité globale', 'Motricité fine', 'Langage', 'Social/Émotionnel', 'Cognitif']

// ─── POST /api/ai/milestones/:childId — jalons OMS ───────────────────────────
const analyzeMilestones = async (req, res, next) => {
  try {
    const child = await getAccessibleChild(req.params.childId, req.user)
    if (!child) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Enfant introuvable' } })

    const milestones = await Milestone.find({ childId: child._id }).sort({ expectedAgeMonths: 1 }).lean()

    // La clé de cache change dès qu'une étape est ajoutée/modifiée
    const lastUpdate = milestones.reduce((max, m) => Math.max(max, new Date(m.updatedAt).getTime()), 0)
    const cacheKey = `milestones_${child._id}_${milestones.length}_${lastUpdate}`
    const cached = getCache(cacheKey)
    if (cached) return res.json({ success: true, data: cached, fromCache: true })

    const ageMonths = ageInMonths(child.dateOfBirth)
    const statusLabel = { atteint: 'atteint', en_cours: 'en cours', non_atteint: 'non atteint' }

    const prompt = `Tu es un pédiatre expert du développement de l'enfant, référencé sur les jalons de développement de l'OMS (WHO Motor Development Study) et les repères du carnet de santé.

PATIENT : ${child.gender === 'F' ? 'fille' : 'garçon'} de ${formatAge(ageMonths)} (${ageMonths} mois)

ÉTAPES DÉJÀ SUIVIES PAR LES PARENTS (${milestones.length}) :
${milestones.length === 0 ? 'Aucune.' : milestones.map(m => `• [${m.category}] ${anonymize(m.title, child)} — ${statusLabel[m.status]}${m.expectedAgeMonths != null ? ` (attendu vers ${m.expectedAgeMonths} mois)` : ''}`).join('\n')}

Désigne toujours le patient par « l'enfant » (aucun prénom).

INSTRUCTIONS : Réponds UNIQUEMENT avec ce JSON valide (sans texte avant/après, sans balises) :
{"assessment":"string","suggestions":[{"category":"string","title":"string","expectedAgeMonths":number,"tip":"string"}]}

- assessment : 3-4 phrases bienveillantes évaluant le développement au regard des jalons OMS pour cet âge (signaler les étapes non atteintes qui devraient l'être, sans jamais diagnostiquer, et conseiller d'en parler au pédiatre si besoin).
- suggestions : 3 à 6 jalons OMS pertinents pour l'âge actuel ou les 6 prochains mois, NON déjà présents dans la liste ci-dessus.
- category : exactement une valeur parmi ${MILESTONE_CATEGORIES.map(c => `"${c}"`).join(', ')}.
- title : jalon court (max 60 caractères), ex "Marche seul".
- tip : une activité simple pour stimuler ce jalon (max 100 caractères).`

    const raw = await callGroq(prompt, 700, 0.3)

    let assessment = ''
    let suggestions = []
    try {
      const jsonMatch = raw.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0])
        assessment = parsed.assessment || ''
        suggestions = (parsed.suggestions || [])
          .filter(s => s && s.title && MILESTONE_CATEGORIES.includes(s.category))
          .slice(0, 6)
          .map(s => ({
            category: s.category,
            title: String(s.title).slice(0, 100),
            expectedAgeMonths: Number.isFinite(Number(s.expectedAgeMonths)) ? Number(s.expectedAgeMonths) : null,
            tip: s.tip ? String(s.tip).slice(0, 200) : ''
          }))
      }
    } catch {
      // réponse IA non exploitable : on renvoie une évaluation générique
    }
    if (!assessment) {
      assessment = `Chaque enfant se développe à son rythme. Notez les progrès de ${child.firstName} et parlez-en avec votre pédiatre lors de la prochaine consultation.`
    }

    const result = { assessment, suggestions, childName: child.firstName, ageMonths, model: PREFERRED_MODEL }
    setCache(cacheKey, result)

    res.json({ success: true, data: result })
  } catch (err) { next(err) }
}

// ─── POST /api/ai/journal/:childId — synthèse du journal ─────────────────────
const summarizeJournal = async (req, res, next) => {
  try {
    const child = await getAccessibleChild(req.params.childId, req.user)
    if (!child) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Enfant introuvable' } })

    // 30 dernières observations, sur les 3 derniers mois maximum
    const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
    const [entries, records] = await Promise.all([
      JournalEntry.find({ childId: child._id, date: { $gte: since } }).sort({ date: -1 }).limit(30).lean(),
      MedicalRecord.find({ childId: child._id, active: true }).lean()
    ])

    if (entries.length === 0) {
      return res.status(400).json({ success: false, error: { code: 'NO_DATA', message: 'Aucune observation sur les 3 derniers mois' } })
    }

    const lastUpdate = entries.reduce((max, e) => Math.max(max, new Date(e.updatedAt).getTime()), 0)
    const cacheKey = `journal_${child._id}_${entries.length}_${lastUpdate}`
    const cached = getCache(cacheKey)
    if (cached) return res.json({ success: true, data: cached, fromCache: true })

    const allergies = records.filter(r => r.type === 'allergie').map(r => anonymize(r.name, child))
    const antecedents = records.filter(r => r.type === 'antecedent').map(r => anonymize(r.name, child))

    const prompt = `Tu es un assistant médical pédiatrique. Les parents tiennent un journal d'observations sur leur enfant. Prépare une synthèse en français, utile à présenter au pédiatre lors de la prochaine consultation.

PATIENT : ${child.gender === 'F' ? 'fille' : 'garçon'} de ${formatAge(ageInMonths(child.dateOfBirth))}
Allergies connues : ${allergies.length ? allergies.join(', ') : 'Aucune'}
Antécédents : ${antecedents.length ? antecedents.join(', ') : 'Aucun'}

OBSERVATIONS (${entries.length}, de la plus récente à la plus ancienne) :
${entries.map(e => `• ${new Date(e.date).toLocaleDateString('fr-FR')} [${e.category}] ${anonymize(e.text.slice(0, 300), child)}`).join('\n')}

Les données ont été anonymisées : désigne toujours le patient par « l'enfant » (aucun prénom).

INSTRUCTIONS :
Rédige une synthèse structurée avec exactement ces 4 sections :
1. **Résumé de la période** (2-3 phrases)
2. **Tendances observées** (sommeil, alimentation, comportement, symptômes récurrents…)
3. **Questions à poser au pédiatre** (2 à 4 questions concrètes tirées des observations)
4. **Points de vigilance** (symptômes à surveiller ; si un signe semble urgent, conseiller de consulter rapidement)

Maximum 220 mots. Ton bienveillant et factuel. Ne jamais diagnostiquer.`

    const summary = await callGroq(prompt, 600, 0.3)
    const result = { summary, childName: child.firstName, entryCount: entries.length, model: PREFERRED_MODEL }
    setCache(cacheKey, result)

    res.json({ success: true, data: result })
  } catch (err) { next(err) }
}

// ─── GET /api/ai/models ──────────────────────────────────────────────────────
const listModels = async (req, res, next) => {
  try {
    const models = await groq.models.list()
    const chatModels = models.data.filter(m =>
      !m.id.includes('whisper') && !m.id.includes('guard')
    )
    res.json({ success: true, data: chatModels.map(m => ({ id: m.id, created: m.created })) })
  } catch (err) { next(err) }
}

module.exports = { generateSummary, generateReminders, analyzeGrowth, analyzeImage, analyzeMilestones, summarizeJournal, listModels }
