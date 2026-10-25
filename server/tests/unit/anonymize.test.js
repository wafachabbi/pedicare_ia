/**
 * Tests unitaires — Anonymisation des textes envoyés au LLM
 * (pas de base de données ni d'appel réseau)
 */
const { anonymize } = require('../../services/anonymize')

describe('anonymize()', () => {
  test('remplace le prénom (insensible à la casse, mot entier)', () => {
    expect(anonymize('ADAM tousse, Adam dort mal', { firstName: 'Adam' })).toBe("l'enfant tousse, l'enfant dort mal")
    expect(anonymize('Adamo joue avec Adam', { firstName: 'Adam' })).toBe("Adamo joue avec l'enfant")
  })

  test('gère les prénoms accentués', () => {
    expect(anonymize('Élodie a de la fièvre', { firstName: 'Élodie' })).toBe("l'enfant a de la fièvre")
  })

  test('masque emails, liens et téléphones', () => {
    const out = anonymize('Écrire à dr.x@clinique.tn, voir https://site.tn ou appeler le +216 98 123 456')
    expect(out).toBe('Écrire à [email], voir [lien] ou appeler le [téléphone]')
  })

  test('masque les noms de praticiens', () => {
    expect(anonymize('Vu le Dr. Karim Ben Ali hier')).toBe('Vu le [médecin] hier')
    expect(anonymize('Docteur Mansour a conseillé du repos')).toBe('[médecin] a conseillé du repos')
  })

  test('conserve les données médicales utiles', () => {
    expect(anonymize('Fièvre à 38,6°C le 12/10/2026', { firstName: 'Lina' })).toBe('Fièvre à 38,6°C le 12/10/2026')
  })

  test('texte vide → chaîne vide', () => {
    expect(anonymize('')).toBe('')
    expect(anonymize(null)).toBe('')
  })
})
