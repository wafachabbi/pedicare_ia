/**
 * QLoRA Service — Intégration du modèle fine-tuné
 * ────────────────────────────────────────────────
 * Ce service appelle le modèle QLoRA fine-tuné via l'API
 * HuggingFace Inference pour la synthèse du journal pédiatrique.
 *
 * Architecture :
 *   Journal (observations) → QLoRA fine-tuné → Synthèse structurée
 *
 * Modes de fonctionnement :
 *   1. QLORA_MODE=huggingface → API HuggingFace Inference (modèle publié)
 *   2. QLORA_MODE=groq        → Fallback sur Groq (si modèle pas encore entraîné)
 *   3. QLORA_MODE=auto        → Essaie HuggingFace, fallback Groq si indisponible
 */

'use strict'

const https = require('https')

// ─── Configuration ────────────────────────────────────────────────────────
const QLORA_MODE      = process.env.QLORA_MODE       || 'auto'
const HF_TOKEN        = process.env.HF_TOKEN         || ''
const HF_MODEL_ID     = process.env.HF_QLORA_MODEL   || ''   // ex: votre-username/pedicare-journal-qlora
const HF_API_URL      = `https://api-inference.huggingface.co/models/${HF_MODEL_ID}`

// Template Alpaca — doit correspondre exactement au format d'entraînement
const ALPACA_TEMPLATE = (instruction, input) =>
  `### Instruction:\n${instruction}\n\n### Input:\n${input}\n\n### Response:\n`

const JOURNAL_INSTRUCTION =
  'Tu es un assistant médical pédiatrique. Synthétise les observations du journal ' +
  'parental en une synthèse structurée utile pour le pédiatre.'

// ─── Appel API HuggingFace Inference ─────────────────────────────────────
async function callHuggingFace(prompt) {
  if (!HF_TOKEN) throw new Error('HF_TOKEN manquant dans .env')
  if (!HF_MODEL_ID) throw new Error('HF_QLORA_MODEL manquant dans .env')

  const body = JSON.stringify({
    inputs: prompt,
    parameters: {
      max_new_tokens: 600,
      temperature: 0.3,
      top_p: 0.9,
      repetition_penalty: 1.1,
      return_full_text: false   // Ne retourne que la partie générée
    }
  })

  return new Promise((resolve, reject) => {
    const options = {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${HF_TOKEN}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body)
      }
    }

    const url = new URL(HF_API_URL)
    const req = https.request(
      { hostname: url.hostname, path: url.pathname, ...options },
      (res) => {
        let data = ''
        res.on('data', chunk => data += chunk)
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data)

            // Gestion modèle en cours de chargement (HF cold start)
            if (parsed.error?.includes('loading')) {
              reject(new Error('MODEL_LOADING'))
              return
            }
            if (parsed.error) {
              reject(new Error(parsed.error))
              return
            }

            // Extraction du texte généré
            const text = Array.isArray(parsed)
              ? parsed[0]?.generated_text || ''
              : parsed.generated_text || ''

            resolve(cleanOutput(text))
          } catch {
            reject(new Error('Réponse HuggingFace invalide'))
          }
        })
      }
    )
    req.on('error', reject)
    req.write(body)
    req.end()
  })
}

// ─── Nettoyage de la sortie du modèle ─────────────────────────────────────
function cleanOutput(text) {
  return text
    .replace(/###\s*(Instruction|Input|Response):/gi, '')  // Supprime les balises Alpaca résiduelles
    .replace(/<\/?s>/g, '')                                 // Tokens spéciaux Mistral
    .replace(/^\s+|\s+$/g, '')                             // Trim
}

// ─── Formatage des observations pour le modèle ───────────────────────────
function formatObservations(entries, child, allergies, antecedents) {
  const ageMonths = Math.floor((Date.now() - new Date(child.dateOfBirth)) / (1000 * 60 * 60 * 24 * 30))
  const age = ageMonths < 24 ? `${ageMonths} mois` : `${Math.floor(ageMonths / 12)} ans`

  const lines = [
    `Observations (${entries.length} entrées, 30 derniers jours) :`,
    ...entries.map(e =>
      `• ${new Date(e.date).toLocaleDateString('fr-FR')} [${e.category}] ${e.text.slice(0, 200)}`
    ),
    `Enfant : ${age}, ${child.gender === 'F' ? 'fille' : 'garçon'}.`,
    allergies.length   ? `Allergies : ${allergies.join(', ')}.`     : '',
    antecedents.length ? `Antécédents : ${antecedents.join(', ')}.` : ''
  ].filter(Boolean)

  return lines.join('\n')
}

// ─── Fonction principale d'appel ─────────────────────────────────────────
/**
 * Synthétise le journal pédiatrique via le modèle QLoRA fine-tuné.
 *
 * @param {Object} child      - Document Child MongoDB
 * @param {Array}  entries    - Entrées journal (30 derniers jours)
 * @param {Array}  allergies  - Liste des allergies (strings)
 * @param {Array}  antecedents- Liste des antécédents (strings)
 * @param {Function} groqFallback - Fonction fallback Groq(prompt) → string
 * @returns {{ summary: string, model: string, technique: string }}
 */
async function summarizeJournalQLoRA(child, entries, allergies, antecedents, groqFallback) {
  const observationsText = formatObservations(entries, child, allergies, antecedents)
  const prompt = ALPACA_TEMPLATE(JOURNAL_INSTRUCTION, observationsText)

  // ── Mode HuggingFace direct ────────────────────────────────────────────
  if (QLORA_MODE === 'huggingface') {
    const summary = await callHuggingFace(prompt)
    return {
      summary,
      model: HF_MODEL_ID,
      technique: 'QLoRA fine-tuned (HuggingFace)'
    }
  }

  // ── Mode Groq direct ───────────────────────────────────────────────────
  if (QLORA_MODE === 'groq') {
    const summary = await groqFallback(prompt)
    return {
      summary,
      model: 'Groq (fallback)',
      technique: 'Prompt Engineering (QLoRA non configuré)'
    }
  }

  // ── Mode auto : essaie HuggingFace, fallback Groq ─────────────────────
  if (QLORA_MODE === 'auto') {
    // Si pas de modèle configuré → Groq directement
    if (!HF_MODEL_ID || !HF_TOKEN) {
      console.log('ℹ️  QLoRA : HF_QLORA_MODEL ou HF_TOKEN non configuré → fallback Groq')
      const summary = await groqFallback(prompt)
      return {
        summary,
        model: 'Groq (QLoRA non entraîné)',
        technique: 'Prompt Engineering (modèle QLoRA en attente d\'entraînement)'
      }
    }

    // Essai HuggingFace
    try {
      const summary = await callHuggingFace(prompt)
      return {
        summary,
        model: HF_MODEL_ID,
        technique: 'QLoRA fine-tuned (HuggingFace)'
      }
    } catch (err) {
      const reason = err.message === 'MODEL_LOADING'
        ? 'modèle HF en cours de chargement (cold start)'
        : err.message
      console.warn(`⚠️  QLoRA HuggingFace indisponible (${reason}) → fallback Groq`)

      const summary = await groqFallback(prompt)
      return {
        summary,
        model: 'Groq (fallback automatique)',
        technique: 'Prompt Engineering (fallback QLoRA)'
      }
    }
  }

  throw new Error(`QLORA_MODE invalide : ${QLORA_MODE}`)
}

// ─── Statut du service ────────────────────────────────────────────────────
function getQLoRAStatus() {
  return {
    mode:         QLORA_MODE,
    modelId:      HF_MODEL_ID || '(non configuré)',
    hfTokenSet:   !!HF_TOKEN,
    ready:        !!(HF_MODEL_ID && HF_TOKEN),
    instructions: !HF_MODEL_ID
      ? 'Entraîner le modèle avec qlora/PediCare_QLoRA_Journal.ipynb puis ajouter HF_QLORA_MODEL dans .env'
      : 'Modèle configuré ✅'
  }
}

module.exports = { summarizeJournalQLoRA, getQLoRAStatus, formatObservations }
