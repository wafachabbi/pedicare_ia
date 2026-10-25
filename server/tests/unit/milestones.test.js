/**
 * Tests unitaires — Étapes de développement (Membre 1)
 * Couvre : CRUD, validation, date atteinte automatique, accès parent / pédiatre
 */
require('dotenv').config()
const request = require('supertest')
const mongoose = require('mongoose')
const app = require('../../app')
const Milestone = require('../../models/Milestone')
const { setupDossier, teardownDossier, auth } = require('./helpers')

const MONGO_TEST_URI = process.env.MONGO_URI_TEST || process.env.MONGO_URI
let ctx, milestoneId
const url = (id = '') => `/api/children/${ctx.childId}/milestones${id ? '/' + id : ''}`

beforeAll(async () => {
  await mongoose.connect(MONGO_TEST_URI)
  ctx = await setupDossier('mile')
}, 30000)

afterAll(async () => {
  await teardownDossier('mile', ctx, Milestone)
  await mongoose.disconnect()
})

describe('POST /api/children/:childId/milestones', () => {
  test('création par le parent → 201', async () => {
    const res = await auth(request(app).post(url()), ctx.parent)
      .send({ category: 'Langage', title: 'Premiers mots', expectedAgeMonths: 12 })
    expect(res.status).toBe(201)
    expect(res.body.data.status).toBe('en_cours')
    expect(res.body.data.achievedAt).toBeNull()
    milestoneId = res.body.data._id
  })

  test('statut "atteint" sans date → date du jour', async () => {
    const res = await auth(request(app).post(url()), ctx.parent)
      .send({ category: 'Motricité globale', title: 'Marche seul', status: 'atteint' })
    expect(res.status).toBe(201)
    expect(res.body.data.achievedAt).toBeTruthy()
  })

  test('titre manquant → 400', async () => {
    const res = await auth(request(app).post(url()), ctx.parent).send({ category: 'Langage' })
    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('VALIDATION_ERROR')
  })

  test('catégorie invalide → erreur de validation', async () => {
    const res = await auth(request(app).post(url()), ctx.parent).send({ category: 'Inconnue', title: 'x' })
    expect(res.status).toBeGreaterThanOrEqual(400)
  })

  test('pédiatre qui suit l\'enfant → 201', async () => {
    const res = await auth(request(app).post(url()), ctx.pediatre)
      .send({ category: 'Cognitif', title: 'Empile 3 cubes' })
    expect(res.status).toBe(201)
  })

  test('pédiatre non assigné → 404', async () => {
    const res = await auth(request(app).post(url()), ctx.otherPediatre).send({ category: 'Cognitif', title: 'x' })
    expect(res.status).toBe(404)
  })
})

describe('GET /api/children/:childId/milestones', () => {
  test('liste parent → 200 + 3 étapes', async () => {
    const res = await auth(request(app).get(url()), ctx.parent)
    expect(res.status).toBe(200)
    expect(res.body.data).toHaveLength(3)
  })

  test('autre parent → 404', async () => {
    const res = await auth(request(app).get(url()), ctx.otherParent)
    expect(res.status).toBe(404)
  })

  test('sans token → 401', async () => {
    const res = await request(app).get(url())
    expect(res.status).toBe(401)
  })
})

describe('PUT /api/children/:childId/milestones/:id', () => {
  test('passage à "atteint" → date renseignée', async () => {
    const res = await auth(request(app).put(url(milestoneId)), ctx.pediatre).send({ status: 'atteint' })
    expect(res.status).toBe(200)
    expect(res.body.data.achievedAt).toBeTruthy()
  })

  test('retour à "en_cours" → date effacée', async () => {
    const res = await auth(request(app).put(url(milestoneId)), ctx.parent).send({ status: 'en_cours' })
    expect(res.status).toBe(200)
    expect(res.body.data.achievedAt).toBeNull()
  })

  test('childId dans le body ignoré (pas de rattachement à un autre enfant)', async () => {
    const res = await auth(request(app).put(url(milestoneId)), ctx.parent)
      .send({ childId: new mongoose.Types.ObjectId().toString(), notes: 'ok' })
    expect(res.status).toBe(200)
    expect(String(res.body.data.childId)).toBe(String(ctx.childId))
  })
})

describe('DELETE /api/children/:childId/milestones/:id', () => {
  test('autre parent → 404', async () => {
    const res = await auth(request(app).delete(url(milestoneId)), ctx.otherParent)
    expect(res.status).toBe(404)
  })

  test('suppression → 200 puis 404', async () => {
    const res = await auth(request(app).delete(url(milestoneId)), ctx.parent)
    expect(res.status).toBe(200)
    const again = await auth(request(app).delete(url(milestoneId)), ctx.parent)
    expect(again.status).toBe(404)
  })
})
