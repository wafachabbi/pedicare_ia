const Groq = require('groq-sdk')
const Child = require('../models/Child')
const Vaccination = require('../models/Vaccination')
const Appointment = require('../models/Appointment')
const Measurement = require('../models/Measurement')
const { summarizeJournalQLoRA } = require('../services/qlora.service')
const Milestone = require('../models/Milestone')
const MedicalRecord = require('../models/MedicalRecord')
const JournalEntry = require('../models/JournalEntry')
const { canAccessChild } = require('../services/childAccess')
const { anonymize } = require('../services/anonymize')
const { ragVaccins, ragCroissance } = require('../services/rag.service')

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
    //Vérifier que l'enfant appartient au parent connecté
    const child = await ownsChild(req.params.childId, req.user.id)
    if (!child) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Enfant introuvable' } })

    // Cache check  verifier cache 
    const cacheKey = `summary_${child._id}`
    const cached = getCache(cacheKey)
    if (cached) return res.json({ success: true, data: cached, fromCache: true })

      //Récupérer les données MongoDB en parallèle
    const [vaccinations, appointments] = await Promise.all([
      Vaccination.find({ childId: child._id }).sort({ administeredAt: -1 }).lean(),
      Appointment.find({ childId: child._id }).sort({ dateTime: -1 }).lean()
    ])

    //calcul age
    const now = new Date()
    //Soustrait la date de naissance à aujourd'hui → résultat en millisecondes et le divise
    const ageMonths = Math.floor((now - new Date(child.dateOfBirth)) / (1000 * 60 * 60 * 24 * 30))
    const age = ageMonths < 24 ? `${ageMonths} mois` : `${Math.floor(ageMonths / 12)} ans`

    // Prompt optimisé — instructions claires, rôle défini, format attendu Context Injection
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

// ─── POST /api/ai/reminders/:childId ─── RAG Vaccins ────────────────────────
const generateReminders = async (req, res, next) => {
  try {
    const child = await ownsChild(req.params.childId, req.user.id)
    if (!child) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Enfant introuvable' } })

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
    const vaccinsRecus = vaccinations.map(v => v.vaccineName)

    // ── RAG : récupérer les recommandations vaccinales pertinentes ────────
    const ragQuery = [
      `vaccins recommandés enfant ${ageMonths} mois ${age}`,
      vaccinsRecus.length > 0 ? `vaccins reçus ${vaccinsRecus.join(' ')}` : 'aucun vaccin',
      'calendrier vaccinal obligatoire rappel',
      ageMonths < 24 ? 'nourrisson primovaccination' : 'enfant rappel annuel'
    ].join(' ')

    // Récupération top 4 documents les plus pertinents pour cet âge
    const ragDocs = ragVaccins.retrieve(ragQuery, 4, { ageMonths })
    const docsToUse = ragDocs.length > 0 ? ragDocs : ragVaccins.retrieve(ragQuery, 4)
    const ragContext = ragVaccins.formatForPrompt(docsToUse, 'CALENDRIER VACCINAL OFFICIEL FRANÇAIS (Santé Publique France 2024)')

    // ── Prompt RAG enrichi + JSON forcing ────────────────────────────────
    const prompt = `Tu es un assistant médical pédiatrique. En te basant UNIQUEMENT sur le calendrier vaccinal officiel fourni ci-dessous, génère des rappels de santé personnalisés en français.
${ragContext}
PATIENT : ${age}, ${child.gender === 'F' ? 'Fille' : 'Garçon'}
Allergies : ${child.allergies || 'Aucune'}
Vaccins déjà reçus : ${vaccinsRecus.length > 0 ? vaccinsRecus.join(', ') : 'Aucun enregistré'}
Rendez-vous à venir : ${appointments.length > 0 ? appointments.map(a => `${a.type} le ${new Date(a.dateTime).toLocaleDateString('fr-FR')}`).join(', ') : 'Aucun'}

INSTRUCTIONS : En comparant les vaccins reçus avec le calendrier officiel fourni ci-dessus pour un enfant de ${ageMonths} mois, identifie les vaccins manquants ou à venir. Réponds UNIQUEMENT avec ce JSON valide (sans texte avant/après) :
{"reminders":[{"type":"urgent|warning|info","title":"string","message":"string","action":"string"}]}

Règles : urgent=vaccin obligatoire manquant, warning=vaccin recommandé proche, info=conseil préventif. Maximum 4 rappels. Base-toi strictement sur les documents fournis.`

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

    const result = { reminders, childName: child.firstName, ragDocsUsed: docsToUse.length, ragSources: docsToUse.map(d => d.title), model: PREFERRED_MODEL, technique: 'RAG + TF-IDF (Calendrier vaccinal FR 2024)' }
    setCache(cacheKey, result)

    res.json({ success: true, data: result })
  } catch (err) { next(err) }
}

// ─── POST /api/ai/growth/:childId ─── RAG OMS ───────────────────────────────
const analyzeGrowth = async (req, res, next) => {
  try {
    const child = await ownsChild(req.params.childId, req.user.id)
    if (!child) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Enfant introuvable' } })

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
    const sexeCode = child.gender === 'F' ? 'F' : 'M'

    const latest = measurements[measurements.length - 1]
    const first  = measurements[0]

    const weightData = measurements.filter(m => m.weight).map(m => ({ date: new Date(m.date).toLocaleDateString('fr-FR'), val: m.weight }))
    const heightData = measurements.filter(m => m.height).map(m => ({ date: new Date(m.date).toLocaleDateString('fr-FR'), val: m.height }))
    const headData   = measurements.filter(m => m.headCircumference).map(m => ({ date: new Date(m.date).toLocaleDateString('fr-FR'), val: m.headCircumference }))

    // ── RAG : récupérer les références OMS pertinentes ────────────────────
    const ragQuery = [
      `croissance enfant ${ageMonths} mois ${sexeCode === 'F' ? 'fille' : 'garçon'}`,
      latest.weight            ? `poids ${latest.weight} kg`                         : '',
      latest.height            ? `taille ${latest.height} cm`                        : '',
      latest.headCircumference ? `périmètre crânien ${latest.headCircumference} cm`  : '',
      'percentile OMS interprétation alerte vitesse croissance'
    ].filter(Boolean).join(' ')

    const ragDocs = ragCroissance.retrieve(ragQuery, 5, { sexe: sexeCode, ageMonths })
    const docsToUse = ragDocs.length > 0 ? ragDocs : ragCroissance.retrieve(ragQuery, 4)
    const ragContext = ragCroissance.formatForPrompt(docsToUse, 'RÉFÉRENCES OFFICIELLES OMS (Percentiles de croissance)')

    const imc = latest.weight && latest.height
      ? (latest.weight / ((latest.height / 100) ** 2)).toFixed(1)
      : null

    // ── Prompt RAG enrichi ────────────────────────────────────────────────
    const prompt = `Tu es un pédiatre expert en croissance infantile. Analyse les données de croissance en te basant STRICTEMENT sur les références OMS fournies.
${ragContext}
DONNÉES PATIENT :
- Âge : ${age} (${ageMonths} mois)
- Sexe : ${child.gender === 'F' ? 'Féminin' : 'Masculin'}
- Suivi : du ${new Date(first.date).toLocaleDateString('fr-FR')} au ${new Date(latest.date).toLocaleDateString('fr-FR')} (${measurements.length} mesures)

COURBE POIDS (kg) : ${weightData.length > 0 ? weightData.map(d => `${d.date}:${d.val}kg`).join(' | ') : 'Aucune donnée'}
COURBE TAILLE (cm) : ${heightData.length > 0 ? heightData.map(d => `${d.date}:${d.val}cm`).join(' | ') : 'Aucune donnée'}
PÉRIMÈTRE CRÂNIEN (cm) : ${headData.length > 0 ? headData.map(d => `${d.date}:${d.val}cm`).join(' | ') : 'Aucune donnée'}

DERNIÈRE MESURE :${latest.weight ? ` Poids ${latest.weight}kg` : ''}${latest.height ? ` | Taille ${latest.height}cm` : ''}${latest.headCircumference ? ` | PC ${latest.headCircumference}cm` : ''}${imc ? ` | IMC ${imc}kg/m²` : ''}

INSTRUCTIONS — 4 sections obligatoires :
1. **Tendance générale** (évolution globale sur la période)
2. **Évaluation par indicateur** (cite les valeurs P3/P50/P97 OMS exactes fournies ci-dessus pour situer chaque mesure)
3. **Points de vigilance** (cassures de courbe, stagnations, valeurs hors couloir normal selon OMS)
4. **Recommandations** (conseils adaptés à l'âge, fréquence de suivi)

Ton : professionnel, bienveillant, accessible. Maximum 280 mots. Ne jamais diagnostiquer.`

    const analysis = await callGroq(prompt, 650, 0.3)

    const result = {
      analysis,
      childName: child.firstName,
      measurementCount: measurements.length,
      latestMeasurement: { date: latest.date, weight: latest.weight, height: latest.height, headCircumference: latest.headCircumference },
      ragDocsUsed: docsToUse.length,
      ragSources: docsToUse.map(d => d.title),
      model: PREFERRED_MODEL,
      technique: 'RAG + TF-IDF (OMS 2006)'
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

// ─── POST /api/ai/journal/:childId — synthèse du journal (QLoRA) ─────────────
const summarizeJournal = async (req, res, next) => {
  try {
    const child = await getAccessibleChild(req.params.childId, req.user)
    if (!child) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Enfant introuvable' } })

    // 30 dernières observations sur les 3 derniers mois
    const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
    const [entries, records] = await Promise.all([
      JournalEntry.find({ childId: child._id, date: { $gte: since } }).sort({ date: -1 }).limit(30).lean(),
      MedicalRecord.find({ childId: child._id, active: true }).lean()
    ])

    if (entries.length === 0) {
      return res.status(400).json({ success: false, error: { code: 'NO_DATA', message: 'Aucune observation sur les 3 derniers mois' } })
    }

    // Cache dynamique basé sur le contenu (invalide si nouvelles entrées)
    const lastUpdate = entries.reduce((max, e) => Math.max(max, new Date(e.updatedAt || e.date).getTime()), 0)
    const cacheKey = `journal_${child._id}_${entries.length}_${lastUpdate}`
    const cached = getCache(cacheKey)
    if (cached) return res.json({ success: true, data: cached, fromCache: true })

    // Anonymisation des données médicales
    const allergies   = records.filter(r => r.type === 'allergie').map(r => anonymize(r.name, child))
    const antecedents = records.filter(r => r.type === 'antecedent').map(r => anonymize(r.name, child))

    // Anonymiser les entrées journal
    const anonymizedEntries = entries.map(e => ({
      ...e,
      text: anonymize(e.text.slice(0, 300), child)
    }))

    // ── Fonction fallback Groq ────────────────────────────────────────────
    // Utilisée si le modèle QLoRA n'est pas encore entraîné/déployé
    const groqFallback = async (prompt) => {
      const ageMonths = ageInMonths(child.dateOfBirth)
      const groqPrompt = `Tu es un assistant médical pédiatrique. Synthétise ces observations de journal pédiatrique en français.

PATIENT : ${child.gender === 'F' ? 'fille' : 'garçon'} de ${formatAge(ageMonths)}
Allergies : ${allergies.length ? allergies.join(', ') : 'Aucune'}
Antécédents : ${antecedents.length ? antecedents.join(', ') : 'Aucun'}

OBSERVATIONS (${anonymizedEntries.length}) :
${anonymizedEntries.map(e => `• ${new Date(e.date).toLocaleDateString('fr-FR')} [${e.category}] ${e.text}`).join('\n')}

Désigne toujours le patient par « l'enfant ». Rédige avec ces 4 sections :
1. **Résumé de la période**
2. **Tendances observées**
3. **Questions à poser au pédiatre**
4. **Points de vigilance**

Maximum 220 mots. Ton bienveillant. Ne jamais diagnostiquer.`

      return callGroq(groqPrompt, 600, 0.3)
    }

    // ── Appel QLoRA (avec fallback automatique sur Groq) ──────────────────
    const qloraResult = await summarizeJournalQLoRA(
      child,
      anonymizedEntries,
      allergies,
      antecedents,
      groqFallback
    )

    const result = {
      summary:     qloraResult.summary,
      childName:   child.firstName,
      entryCount:  entries.length,
      model:       qloraResult.model,
      technique:   qloraResult.technique
    }

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
