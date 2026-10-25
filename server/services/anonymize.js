// Anonymisation des textes envoyés au LLM
// (règle du projet : ne jamais envoyer de données personnelles brutes au modèle)

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/**
 * Remplace dans un texte libre :
 * - le prénom de l'enfant → « l'enfant »
 * - les emails, URLs, numéros de téléphone
 * - les noms de praticiens précédés de Dr / Docteur / Pr
 */
function anonymize(text, { firstName } = {}) {
  if (!text) return ''
  let out = String(text)
    .replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, '[email]')
    .replace(/\bhttps?:\/\/\S+/gi, '[lien]')
    .replace(/(?:\+\d{1,3}[\s.-]?)?(?:\d[\s.-]?){8,}\d/g, '[téléphone]')
    .replace(/\b(?:Dr|Docteur|Pr|Professeur)\.?\s+[A-ZÀ-Ý][\p{L}'-]*(?:\s+[A-ZÀ-Ý][\p{L}'-]*){0,2}/gu, '[médecin]')

  if (firstName && firstName.trim().length > 1) {
    // \b ne gère pas les accents : on délimite avec des classes Unicode
    const re = new RegExp(`(^|[^\\p{L}])${escapeRegex(firstName.trim())}(?=[^\\p{L}]|$)`, 'giu')
    out = out.replace(re, "$1l'enfant")
  }
  return out
}

module.exports = { anonymize }
