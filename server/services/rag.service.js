/**
 * RAG Service — Retrieval-Augmented Generation
 * ─────────────────────────────────────────────
 * Implémentation 100% JavaScript, zéro dépendance externe.
 *
 * Technique : TF-IDF + similarité cosinus
 * ┌──────────────────────────────────────────────────────────┐
 * │  TF  = fréquence d'un terme dans un document            │
 * │  IDF = log(N / nb docs contenant le terme)              │
 * │  TF-IDF = TF × IDF  →  vecteur de chaque document      │
 * │  Similarité cosinus = cos(θ) entre vecteur requête      │
 * │                       et vecteur document               │
 * └──────────────────────────────────────────────────────────┘
 *
 * Pipeline RAG :
 *   1. Tokeniser le texte (mots minuscules, stop-words supprimés)
 *   2. Calculer TF-IDF pour tous les documents (au chargement)
 *   3. À chaque requête : vectoriser la requête, calculer cos(θ)
 *      avec chaque document, retourner les top-K plus proches
 *   4. Injecter les documents récupérés dans le prompt LLM
 */

'use strict'

const path = require('path')
const fs   = require('fs')

// ─── Stop-words français ───────────────────────────────────────────────────
const STOP_WORDS = new Set([
  'le','la','les','de','du','des','un','une','et','en','au','aux',
  'à','par','pour','sur','sous','dans','avec','sans','ou','mais',
  'est','sont','été','être','avoir','que','qui','quoi','dont',
  'se','si','ne','pas','plus','très','aussi','comme','il','elle',
  'ils','elles','nous','vous','on','ce','cet','cette','ces',
  'mon','ton','son','ma','ta','sa','nos','vos','ses','y','n'
])

// ─── Tokenisation ─────────────────────────────────────────────────────────
function tokenize(text) {
  return text
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // supprime accents
    .replace(/[^a-z0-9\s]/g, ' ')                     // garde lettres/chiffres
    .split(/\s+/)
    .filter(t => t.length > 2 && !STOP_WORDS.has(t))
}

// ─── TF — Term Frequency ──────────────────────────────────────────────────
function computeTF(tokens) {
  const freq = {}
  for (const t of tokens) freq[t] = (freq[t] || 0) + 1
  const total = tokens.length
  const tf = {}
  for (const [term, count] of Object.entries(freq)) {
    tf[term] = count / total
  }
  return tf
}

// ─── IDF — Inverse Document Frequency ────────────────────────────────────
function computeIDF(documents) {
  const N   = documents.length
  const df  = {}  // nb de documents contenant chaque terme
  for (const doc of documents) {
    const terms = new Set(doc.tokens)
    for (const t of terms) df[t] = (df[t] || 0) + 1
  }
  const idf = {}
  for (const [term, count] of Object.entries(df)) {
    idf[term] = Math.log((N + 1) / (count + 1)) + 1  // lissage +1
  }
  return idf
}

// ─── Vecteur TF-IDF ───────────────────────────────────────────────────────
function tfidfVector(tf, idf) {
  const vec = {}
  for (const [term, tfVal] of Object.entries(tf)) {
    vec[term] = tfVal * (idf[term] || 1)
  }
  return vec
}

// ─── Similarité cosinus entre deux vecteurs sparse ───────────────────────
function cosineSimilarity(vecA, vecB) {
  let dot = 0, normA = 0, normB = 0
  // Produit scalaire
  for (const [term, val] of Object.entries(vecA)) {
    if (vecB[term]) dot += val * vecB[term]
    normA += val * val
  }
  for (const val of Object.values(vecB)) normB += val * val
  if (normA === 0 || normB === 0) return 0
  return dot / (Math.sqrt(normA) * Math.sqrt(normB))
}

// ─── Classe RagIndex ──────────────────────────────────────────────────────
class RagIndex {
  constructor(name) {
    this.name      = name
    this.documents = []   // { id, title, content, metadata, tokens, tf, vector }
    this.idf       = {}
    this.built     = false
  }

  /**
   * Charge et indexe les documents depuis un fichier JSON
   * @param {string} filePath - chemin absolu vers le fichier JSON
   */
  loadFromFile(filePath) {
    const raw  = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
    const docs = raw.documents || []

    // Tokenisation + TF pour chaque document
    this.documents = docs.map(doc => {
      // Texte enrichi = titre + contenu + keywords
      const fullText = [
        doc.title   || '',
        doc.content || '',
        (doc.keywords || []).join(' ')
      ].join(' ')

      const tokens = tokenize(fullText)
      const tf     = computeTF(tokens)

      return {
        id:       doc.id,
        title:    doc.title,
        content:  doc.content,
        metadata: {
          ageMin:     doc.ageMin,
          ageMax:     doc.ageMax,
          sexe:       doc.sexe,
          mesure:     doc.mesure,
          obligatoire: doc.obligatoire,
          vaccins:    doc.vaccins,
          source:     raw.source
        },
        tokens,
        tf
      }
    })

    // Calcul IDF sur tout le corpus
    this.idf = computeIDF(this.documents)

    // Vecteurs TF-IDF finaux
    for (const doc of this.documents) {
      doc.vector = tfidfVector(doc.tf, this.idf)
    }

    this.built = true
    console.log(`📚 RAG [${this.name}] : ${this.documents.length} documents indexés`)
    return this
  }

  /**
   * Recherche les K documents les plus pertinents pour une requête
   * @param {string} query        - texte de la requête
   * @param {number} topK         - nombre de résultats (défaut 3)
   * @param {Object} filters      - filtres optionnels { sexe, mesure, ageMonths }
   * @returns {Array}             - documents triés par score décroissant
   */
  retrieve(query, topK = 3, filters = {}) {
    if (!this.built) throw new Error(`Index RAG [${this.name}] non construit`)

    // Vectoriser la requête
    const qTokens = tokenize(query)
    const qTF     = computeTF(qTokens)
    const qVec    = tfidfVector(qTF, this.idf)

    // Calculer similarité avec chaque document
    let candidates = this.documents.map(doc => ({
      ...doc,
      score: cosineSimilarity(qVec, doc.vector)
    }))

    // ── Filtres optionnels ────────────────────────────────────────────────
    if (filters.sexe) {
      candidates = candidates.filter(d =>
        !d.metadata.sexe || d.metadata.sexe === filters.sexe
      )
    }
    if (filters.mesure) {
      candidates = candidates.filter(d =>
        !d.metadata.mesure || d.metadata.mesure === filters.mesure
      )
    }
    if (filters.ageMonths !== undefined) {
      candidates = candidates.filter(d => {
        const min = d.metadata.ageMin
        const max = d.metadata.ageMax
        if (min === undefined || max === undefined) return true
        return filters.ageMonths >= min && filters.ageMonths <= max + 3 // +3 mois de tolérance
      })
    }

    // Trier par score décroissant, retourner top-K
    return candidates
      .sort((a, b) => b.score - a.score)
      .slice(0, topK)
      .filter(d => d.score > 0)  // ignorer les non-pertinents
  }

  /**
   * Formate les documents récupérés pour injection dans un prompt LLM
   * @param {Array}  docs     - résultats de retrieve()
   * @param {string} header   - titre de la section dans le prompt
   * @returns {string}
   */
  formatForPrompt(docs, header = 'DOCUMENTS DE RÉFÉRENCE') {
    if (!docs.length) return ''
    const lines = [`\n${header} (source : ${this.documents[0]?.metadata?.source || 'base officielle'}) :\n`]
    for (const doc of docs) {
      lines.push(`📄 ${doc.title}`)
      lines.push(doc.content)
      lines.push('')
    }
    return lines.join('\n')
  }
}

// ─── Instances pré-chargées au démarrage du serveur ──────────────────────
const DATA_DIR = path.join(__dirname, '../data')

const ragVaccins    = new RagIndex('Vaccins FR 2024')
const ragCroissance = new RagIndex('Croissance OMS')

try {
  ragVaccins.loadFromFile(path.join(DATA_DIR, 'rag-vaccins.json'))
  ragCroissance.loadFromFile(path.join(DATA_DIR, 'rag-croissance-oms.json'))
} catch (err) {
  console.error('⚠️  Erreur chargement index RAG :', err.message)
}

// ─── Exports ──────────────────────────────────────────────────────────────
module.exports = {
  ragVaccins,
  ragCroissance,
  RagIndex,
  // Helpers utilitaires exposés pour les tests
  tokenize,
  cosineSimilarity,
  tfidfVector
}
