/**
 * Tests unitaires — Allergies & Antécédents médicaux (Membre 1)
 * Couvre : CRUD, filtre par type, validation, accès parent / pédiatre
 */
require('dotenv').config()
const request = require('supertest')
const mongoose = require('mongoose')
const app = require('../../app')
const MedicalRecord = require('../../models/MedicalRecord')
const { setupDossier, teardownDossier, auth } = require('./helpers')

const MONGO_TEST_URI = process.env.MONGO_URI_TEST || process.env.MONGO_URI
let ctx, allergyId
const url = (id = '') => `/api/children/${ctx.childId}/medical-records${id ? '/' + id : ''}`

beforeAll(async () => {
  await mongoose.connect(MONGO_TEST_URI)
  ctx = await setupDossier('medrec')
}, 30000)

afterAll(async () => {
  await teardownDossier('medrec', ctx, MedicalRecord)
  await mongoose.disconnect()
})

describe('POST /api/children/:childId/medical-records', () => {
  test('allergie par le parent → 201', async () => {
    const res = await auth(request(app).post(url()), ctx.parent)
      .send({ type: 'allergie', name: 'Arachides', severity: 'severe', reaction: 'Urticaire' })
    expect(res.status).toBe(201)
    expect(res.body.data.active).toBe(true)
    allergyId = res.body.data._id
  })

  test('antécédent par le pédiatre qui suit l\'enfant → 201', async () => {
    const res = await auth(request(app).post(url()), ctx.pediatre)
      .send({ type: 'antecedent', name: 'Bronchiolite', diagnosedAt: '2025-01-10' })
    expect(res.status).toBe(201)
  })

  test('sévérité vide acceptée (champ optionnel) → 201', async () => {
    const res = await auth(request(app).post(url()), ctx.parent)
      .send({ type: 'allergie', name: 'Pollen', severity: '' })
    expect(res.status).toBe(201)
    expect(res.body.data.severity).toBeNull()
  })

  test('nom manquant → 400', async () => {
    const res = await auth(request(app).post(url()), ctx.parent).send({ type: 'allergie' })
    expect(res.status).toBe(400)
  })

  test('type invalide → erreur de validation', async () => {
    const res = await auth(request(app).post(url()), ctx.parent).send({ type: 'autre', name: 'x' })
    expect(res.status).toBeGreaterThanOrEqual(400)
  })

  test('pédiatre non assigné → 404', async () => {
    const res = await auth(request(app).post(url()), ctx.otherPediatre).send({ type: 'allergie', name: 'x' })
    expect(res.status).toBe(404)
  })
})

describe('GET /api/children/:childId/medical-records', () => {
  test('liste complète → 3 éléments', async () => {
    const res = await auth(request(app).get(url()), ctx.parent)
    expect(res.status).toBe(200)
    expect(res.body.data).toHaveLength(3)
  })

  test('filtre ?type=antecedent → 1 élément', async () => {
    const res = await auth(request(app).get(url() + '?type=antecedent'), ctx.pediatre)
    expect(res.status).toBe(200)
    expect(res.body.data).toHaveLength(1)
    expect(res.body.data[0].type).toBe('antecedent')
  })

  test('autre parent → 404', async () => {
    const res = await auth(request(app).get(url()), ctx.otherParent)
    expect(res.status).toBe(404)
  })
})

describe('PUT / DELETE /api/children/:childId/medical-records/:id', () => {
  test('marquer comme résolu → active false', async () => {
    const res = await auth(request(app).put(url(allergyId)), ctx.pediatre).send({ active: false })
    expect(res.status).toBe(200)
    expect(res.body.data.active).toBe(false)
  })

  test('sévérité invalide → erreur de validation', async () => {
    const res = await auth(request(app).put(url(allergyId)), ctx.parent).send({ severity: 'extreme' })
    expect(res.status).toBeGreaterThanOrEqual(400)
  })

  test('suppression → 200', async () => {
    const res = await auth(request(app).delete(url(allergyId)), ctx.parent)
    expect(res.status).toBe(200)
  })
})
