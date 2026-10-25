/**
 * Tests IA — Jalons OMS (Membre 1) & Synthèse du journal (Membre 4)
 * Appels réels à l'API Groq : nécessite GROQ_API_KEY
 */
require('dotenv').config()
const request = require('supertest')
const mongoose = require('mongoose')
const app = require('../../app')
const Milestone = require('../../models/Milestone')
const JournalEntry = require('../../models/JournalEntry')
const Child = require('../../models/Child')
const { setupDossier, teardownDossier, auth } = require('./helpers')

const MONGO_TEST_URI = process.env.MONGO_URI_TEST || process.env.MONGO_URI
const CATEGORIES = ['Motricité globale', 'Motricité fine', 'Langage', 'Social/Émotionnel', 'Cognitif']
// Prénom volontairement rare : s'il apparaît dans la réponse, c'est qu'il a été envoyé au LLM
const FIRST_NAME = 'Zéphyrine'
let ctx

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

describe('POST /api/ai/milestones/:childId', () => {
  test('analyse → 200 + évaluation + suggestions valides', async () => {
    const res = await auth(request(app).post(`/api/ai/milestones/${ctx.childId}`), ctx.parent)
    expect(res.status).toBe(200)
    expect(typeof res.body.data.assessment).toBe('string')
    expect(res.body.data.assessment.length).toBeGreaterThan(20)
    expect(Array.isArray(res.body.data.suggestions)).toBe(true)
    for (const s of res.body.data.suggestions) {
      expect(CATEGORIES).toContain(s.category)
      expect(s.title).toBeTruthy()
    }
    // Le prénom n'est jamais envoyé au modèle
    expect(JSON.stringify(res.body.data.suggestions) + res.body.data.assessment).not.toMatch(new RegExp(FIRST_NAME, 'i'))
  }, 30000)

  test('2ème appel sans modification → depuis le cache', async () => {
    const res = await auth(request(app).post(`/api/ai/milestones/${ctx.childId}`), ctx.parent)
    expect(res.body.fromCache).toBe(true)
  }, 10000)

  test('pédiatre assigné → 200 (cache)', async () => {
    const res = await auth(request(app).post(`/api/ai/milestones/${ctx.childId}`), ctx.pediatre)
    expect(res.status).toBe(200)
  }, 10000)

  test('pédiatre non assigné → 404', async () => {
    const res = await auth(request(app).post(`/api/ai/milestones/${ctx.childId}`), ctx.otherPediatre)
    expect(res.status).toBe(404)
  })
})

describe('POST /api/ai/journal/:childId', () => {
  test('synthèse → 200 + 4 sections, sans données personnelles', async () => {
    const res = await auth(request(app).post(`/api/ai/journal/${ctx.childId}`), ctx.pediatre)
    expect(res.status).toBe(200)
    const summary = res.body.data.summary
    expect(summary).toMatch(/Résumé/i)
    expect(summary).toMatch(/Questions/i)
    expect(summary).not.toMatch(new RegExp(FIRST_NAME, 'i'))
    expect(summary).not.toMatch(/Ben Ali|98 123 456/)
    expect(res.body.data.entryCount).toBe(2)
  }, 30000)

  test('nouvelle observation → cache invalidé', async () => {
    await auth(request(app).post(`/api/children/${ctx.childId}/journal`), ctx.parent).send({ category: 'Alimentation', text: 'Mange bien' })
    const res = await auth(request(app).post(`/api/ai/journal/${ctx.childId}`), ctx.parent)
    expect(res.status).toBe(200)
    expect(res.body.fromCache).toBeUndefined()
    expect(res.body.data.entryCount).toBe(3)
  }, 30000)

  test('autre parent → 404', async () => {
    const res = await auth(request(app).post(`/api/ai/journal/${ctx.childId}`), ctx.otherParent)
    expect(res.status).toBe(404)
  })

  test('sans token → 401', async () => {
    const res = await request(app).post(`/api/ai/journal/${ctx.childId}`)
    expect(res.status).toBe(401)
  })
})
