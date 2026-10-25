/**
 * Tests unitaires — Journal des observations (Membre 4)
 * Couvre : CRUD, filtre catégorie, validation, pédiatre en lecture seule
 */
require('dotenv').config()
const request = require('supertest')
const mongoose = require('mongoose')
const app = require('../../app')
const JournalEntry = require('../../models/JournalEntry')
const { setupDossier, teardownDossier, auth } = require('./helpers')

const MONGO_TEST_URI = process.env.MONGO_URI_TEST || process.env.MONGO_URI
let ctx, entryId
const url = (id = '') => `/api/children/${ctx.childId}/journal${id ? '/' + id : ''}`

beforeAll(async () => {
  await mongoose.connect(MONGO_TEST_URI)
  ctx = await setupDossier('journal')
}, 30000)

afterAll(async () => {
  await teardownDossier('journal', ctx, JournalEntry)
  await mongoose.disconnect()
})

describe('POST /api/children/:childId/journal', () => {
  test('création par le parent → 201', async () => {
    const res = await auth(request(app).post(url()), ctx.parent)
      .send({ category: 'Sommeil', text: 'Nuit agitée', date: '2026-10-01' })
    expect(res.status).toBe(201)
    entryId = res.body.data._id
  })

  test('date absente → date du jour par défaut', async () => {
    const res = await auth(request(app).post(url()), ctx.parent).send({ category: 'Symptôme', text: 'Fièvre 38,5°C' })
    expect(res.status).toBe(201)
    expect(res.body.data.date).toBeTruthy()
  })

  test('texte manquant → 400', async () => {
    const res = await auth(request(app).post(url()), ctx.parent).send({ category: 'Sommeil' })
    expect(res.status).toBe(400)
  })

  test('catégorie invalide → erreur de validation', async () => {
    const res = await auth(request(app).post(url()), ctx.parent).send({ category: 'Inconnue', text: 'x' })
    expect(res.status).toBeGreaterThanOrEqual(400)
  })

  test('texte > 2000 caractères → erreur de validation', async () => {
    const res = await auth(request(app).post(url()), ctx.parent).send({ category: 'Autre', text: 'a'.repeat(2001) })
    expect(res.status).toBeGreaterThanOrEqual(400)
  })

  test('pédiatre (même assigné) → 403', async () => {
    const res = await auth(request(app).post(url()), ctx.pediatre).send({ category: 'Autre', text: 'x' })
    expect(res.status).toBe(403)
  })
})

describe('GET /api/children/:childId/journal', () => {
  test('liste parent → 2 observations, la plus récente en premier', async () => {
    const res = await auth(request(app).get(url()), ctx.parent)
    expect(res.status).toBe(200)
    expect(res.body.data).toHaveLength(2)
    expect(new Date(res.body.data[0].date) >= new Date(res.body.data[1].date)).toBe(true)
  })

  test('filtre ?category=Sommeil → 1 observation', async () => {
    const res = await auth(request(app).get(url() + '?category=Sommeil'), ctx.parent)
    expect(res.body.data).toHaveLength(1)
  })

  test('pédiatre assigné → lecture autorisée', async () => {
    const res = await auth(request(app).get(url()), ctx.pediatre)
    expect(res.status).toBe(200)
    expect(res.body.data).toHaveLength(2)
  })

  test('pédiatre non assigné → 404', async () => {
    const res = await auth(request(app).get(url()), ctx.otherPediatre)
    expect(res.status).toBe(404)
  })

  test('autre parent → 404', async () => {
    const res = await auth(request(app).get(url()), ctx.otherParent)
    expect(res.status).toBe(404)
  })
})

describe('PUT / DELETE /api/children/:childId/journal/:id', () => {
  test('modification parent → 200', async () => {
    const res = await auth(request(app).put(url(entryId)), ctx.parent).send({ text: 'Nuit très agitée' })
    expect(res.status).toBe(200)
    expect(res.body.data.text).toBe('Nuit très agitée')
  })

  test('modification pédiatre → 403', async () => {
    const res = await auth(request(app).put(url(entryId)), ctx.pediatre).send({ text: 'x' })
    expect(res.status).toBe(403)
  })

  test('suppression pédiatre → 403', async () => {
    const res = await auth(request(app).delete(url(entryId)), ctx.pediatre)
    expect(res.status).toBe(403)
  })

  test('suppression parent → 200', async () => {
    const res = await auth(request(app).delete(url(entryId)), ctx.parent)
    expect(res.status).toBe(200)
  })
})
