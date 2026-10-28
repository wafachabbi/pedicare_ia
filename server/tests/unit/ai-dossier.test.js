/**
 * Tests IA — Jalons OMS (Membre 1) & Synthèse du journal (Membre 4)
 * Groq est mocké : tests déterministes, sans quota ni GROQ_API_KEY
 */
require('dotenv').config()

jest.mock('groq-sdk', () => {
  const mockCreate = jest.fn()
  const Groq = jest.fn().mockImplementation(() => ({
    chat: { completions: { create: mockCreate } },
    models: { list: jest.fn() }
  }))
  Groq.mockCreate = mockCreate
  return Groq
})

const request = require('supertest')
const mongoose = require('mongoose')
const Groq = require('groq-sdk')
const app = require('../../app')
const Milestone = require('../../models/Milestone')
const JournalEntry = require('../../models/JournalEntry')
const Child = require('../../models/Child')
const { setupDossier, teardownDossier, auth } = require('./helpers')

const mockCreate = Groq.mockCreate
const MONGO_TEST_URI = process.env.MONGO_URI_TEST || process.env.MONGO_URI
const CATEGORIES = ['Motricité globale', 'Motricité fine', 'Langage', 'Social/Émotionnel', 'Cognitif']
// Prénom volontairement rare : s'il apparaît dans le prompt, c'est qu'il a été envoyé au LLM
const FIRST_NAME = 'Zéphyrine'
let ctx

const llmReply = (content) => ({ choices: [{ message: { content } }] })
const lastPrompt = () => mockCreate.mock.calls.at(-1)[0].messages.map(m => m.content).join('\n')

const MILESTONES_REPLY = `<think>raisonnement interne</think>${JSON.stringify({
  assessment: "L'enfant progresse bien pour son âge. La position assise est acquise et le babillage est en cours, ce qui correspond aux repères OMS.",
  suggestions: [
    { category: 'Motricité globale', title: 'Se met debout avec appui', expectedAgeMonths: 9, tip: 'Placer un jouet sur le canapé' },
    { category: 'Langage', title: 'Dit papa/mama', expectedAgeMonths: 10, tip: 'Nommer les objets du quotidien' },
    { category: 'Catégorie inventée', title: 'Doit être filtrée', expectedAgeMonths: 9, tip: '' }
  ]
})}`

const JOURNAL_REPLY = `1. **Résumé de la période** L'enfant a eu un épisode de fièvre et des réveils nocturnes.
2. **Tendances observées** Sommeil perturbé.
3. **Questions à poser au pédiatre** Faut-il surveiller la température ?
4. **Points de vigilance** Consulter si la fièvre persiste.`

beforeAll(async () => {
  await mongoose.connect(MONGO_TEST_URI)
  ctx = await setupDossier('aidos')
  await Child.updateOne({ _id: ctx.childId }, { $set: { firstName: FIRST_NAME } })
  await Milestone.create([
    { childId: ctx.childId, category: 'Motricité globale', title: `${FIRST_NAME} tient assise`, expectedAgeMonths: 7, status: 'atteint', achievedAt: new Date() },
    { childId: ctx.childId, category: 'Langage', title: 'Babille', expectedAgeMonths: 8, status: 'en_cours' }
  ])
  await JournalEntry.create([
    { childId: ctx.childId, category: 'Symptôme', text: `${FIRST_NAME} a 38,5°C de fièvre, appelé le Dr. Karim Ben Ali au +216 98 123 456` },
    { childId: ctx.childId, category: 'Sommeil', text: 'Réveils nocturnes fréquents' }
  ])
}, 30000)

afterAll(async () => {
  await Milestone.deleteMany({ childId: ctx.childId })
  await teardownDossier('aidos', ctx, JournalEntry)
  await mongoose.disconnect()
})

beforeEach(() => mockCreate.mockReset())

describe('POST /api/ai/milestones/:childId', () => {
  test('analyse → 200 + évaluation + suggestions valides', async () => {
    mockCreate.mockResolvedValueOnce(llmReply(MILESTONES_REPLY))
    const res = await auth(request(app).post(`/api/ai/milestones/${ctx.childId}`), ctx.parent)
    expect(res.status).toBe(200)
    expect(res.body.data.assessment.length).toBeGreaterThan(20)
    expect(res.body.data.assessment).not.toMatch(/<think>/)
    // La catégorie hors liste OMS est filtrée
    expect(res.body.data.suggestions).toHaveLength(2)
    for (const s of res.body.data.suggestions) {
      expect(CATEGORIES).toContain(s.category)
      expect(s.title).toBeTruthy()
    }
  })

  test('le prompt envoyé au LLM ne contient pas le prénom', async () => {
    // La clé de cache dépend des étapes : on en modifie une pour forcer un nouvel appel
    await Milestone.updateOne({ childId: ctx.childId, title: 'Babille' }, { $set: { status: 'atteint' } })
    mockCreate.mockResolvedValueOnce(llmReply(MILESTONES_REPLY))
    const res = await auth(request(app).post(`/api/ai/milestones/${ctx.childId}`), ctx.parent)
    expect(res.status).toBe(200)
    expect(mockCreate).toHaveBeenCalledTimes(1)
    expect(lastPrompt()).not.toMatch(new RegExp(FIRST_NAME, 'i'))
    expect(lastPrompt()).toMatch(/l'enfant tient assise/i)
  })

  test('réponse IA non exploitable → évaluation générique', async () => {
    await Milestone.updateOne({ childId: ctx.childId, title: 'Babille' }, { $set: { status: 'en_cours' } })
    mockCreate.mockResolvedValueOnce(llmReply('pas du JSON'))
    const res = await auth(request(app).post(`/api/ai/milestones/${ctx.childId}`), ctx.parent)
    expect(res.status).toBe(200)
    expect(res.body.data.suggestions).toEqual([])
    expect(res.body.data.assessment).toMatch(/à son rythme/)
  })

  test('2ème appel sans modification → depuis le cache, sans appel LLM', async () => {
    const res = await auth(request(app).post(`/api/ai/milestones/${ctx.childId}`), ctx.parent)
    expect(res.body.fromCache).toBe(true)
    expect(mockCreate).not.toHaveBeenCalled()
  })

  test('pédiatre assigné → 200 (cache)', async () => {
    const res = await auth(request(app).post(`/api/ai/milestones/${ctx.childId}`), ctx.pediatre)
    expect(res.status).toBe(200)
  })

  test('pédiatre non assigné → 404', async () => {
    const res = await auth(request(app).post(`/api/ai/milestones/${ctx.childId}`), ctx.otherPediatre)
    expect(res.status).toBe(404)
  })
})

describe('POST /api/ai/journal/:childId', () => {
  test('synthèse → 200 + 4 sections, prompt sans données personnelles', async () => {
    mockCreate.mockResolvedValueOnce(llmReply(JOURNAL_REPLY))
    const res = await auth(request(app).post(`/api/ai/journal/${ctx.childId}`), ctx.pediatre)
    expect(res.status).toBe(200)
    expect(res.body.data.summary).toMatch(/Résumé/i)
    expect(res.body.data.summary).toMatch(/Questions/i)
    expect(res.body.data.entryCount).toBe(2)

    const prompt = lastPrompt()
    expect(prompt).not.toMatch(new RegExp(FIRST_NAME, 'i'))
    expect(prompt).not.toMatch(/Ben Ali|98 123 456/)
    expect(prompt).toMatch(/38,5°C/)
  })

  test('nouvelle observation → cache invalidé', async () => {
    await auth(request(app).post(`/api/children/${ctx.childId}/journal`), ctx.parent).send({ category: 'Alimentation', text: 'Mange bien' })
    mockCreate.mockResolvedValueOnce(llmReply(JOURNAL_REPLY))
    const res = await auth(request(app).post(`/api/ai/journal/${ctx.childId}`), ctx.parent)
    expect(res.status).toBe(200)
    expect(res.body.fromCache).toBeUndefined()
    expect(res.body.data.entryCount).toBe(3)
    expect(mockCreate).toHaveBeenCalledTimes(1)
  })

  test('modèle principal indisponible (503) → fallback', async () => {
    await auth(request(app).post(`/api/children/${ctx.childId}/journal`), ctx.parent).send({ category: 'Sommeil', text: 'Nuit complète' })
    mockCreate
      .mockRejectedValueOnce(Object.assign(new Error('unavailable'), { status: 503 }))
      .mockResolvedValueOnce(llmReply(JOURNAL_REPLY))
    const res = await auth(request(app).post(`/api/ai/journal/${ctx.childId}`), ctx.parent)
    expect(res.status).toBe(200)
    expect(mockCreate).toHaveBeenCalledTimes(2)
    expect(mockCreate.mock.calls[1][0].model).not.toBe(mockCreate.mock.calls[0][0].model)
  })

  test('autre parent → 404', async () => {
    const res = await auth(request(app).post(`/api/ai/journal/${ctx.childId}`), ctx.otherParent)
    expect(res.status).toBe(404)
  })

  test('sans token → 401', async () => {
    const res = await request(app).post(`/api/ai/journal/${ctx.childId}`)
    expect(res.status).toBe(401)
  })
})
