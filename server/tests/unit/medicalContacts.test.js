/**
 * Tests unitaires — Contacts médicaux (Membre 4)
 * Couvre : CRUD, email optionnel / invalide, pédiatre en lecture seule
 */
require('dotenv').config()
const request = require('supertest')
const mongoose = require('mongoose')
const app = require('../../app')
const MedicalContact = require('../../models/MedicalContact')
const { setupDossier, teardownDossier, auth } = require('./helpers')

const MONGO_TEST_URI = process.env.MONGO_URI_TEST || process.env.MONGO_URI
let ctx, contactId
const url = (id = '') => `/api/children/${ctx.childId}/medical-contacts${id ? '/' + id : ''}`

beforeAll(async () => {
  await mongoose.connect(MONGO_TEST_URI)
  ctx = await setupDossier('contact')
}, 30000)

afterAll(async () => {
  await teardownDossier('contact', ctx, MedicalContact)
  await mongoose.disconnect()
})

describe('POST /api/children/:childId/medical-contacts', () => {
  test('création complète → 201', async () => {
    const res = await auth(request(app).post(url()), ctx.parent).send({
      type: 'specialiste', name: 'Dr. ORL', specialty: 'ORL', phone: '+216 71 000 000', email: 'ORL@Clinique.TN'
    })
    expect(res.status).toBe(201)
    expect(res.body.data.email).toBe('orl@clinique.tn')
    contactId = res.body.data._id
  })

  test('email vide → accepté, champ absent', async () => {
    const res = await auth(request(app).post(url()), ctx.parent).send({ type: 'pediatre', name: 'Dr. Test', email: '' })
    expect(res.status).toBe(201)
    expect(res.body.data.email).toBeUndefined()
  })

  test('email invalide → erreur de validation', async () => {
    const res = await auth(request(app).post(url()), ctx.parent).send({ type: 'autre', name: 'x', email: 'abc' })
    expect(res.status).toBeGreaterThanOrEqual(400)
  })

  test('nom manquant → 400', async () => {
    const res = await auth(request(app).post(url()), ctx.parent).send({ type: 'pediatre' })
    expect(res.status).toBe(400)
  })

  test('pédiatre assigné → 403 (lecture seule)', async () => {
    const res = await auth(request(app).post(url()), ctx.pediatre).send({ type: 'autre', name: 'x' })
    expect(res.status).toBe(403)
  })
})

describe('GET /api/children/:childId/medical-contacts', () => {
  test('liste parent → 2 contacts', async () => {
    const res = await auth(request(app).get(url()), ctx.parent)
    expect(res.status).toBe(200)
    expect(res.body.data).toHaveLength(2)
  })

  test('pédiatre assigné → lecture autorisée', async () => {
    const res = await auth(request(app).get(url()), ctx.pediatre)
    expect(res.status).toBe(200)
  })

  test('pédiatre non assigné → 404', async () => {
    const res = await auth(request(app).get(url()), ctx.otherPediatre)
    expect(res.status).toBe(404)
  })

  test('ancienne route /api/medical-contacts supprimée → 404', async () => {
    const res = await auth(request(app).get(`/api/medical-contacts/${ctx.childId}`), ctx.parent)
    expect(res.status).toBe(404)
  })
})

describe('PUT / DELETE /api/children/:childId/medical-contacts/:id', () => {
  test('modification → pas de doublon', async () => {
    const res = await auth(request(app).put(url(contactId)), ctx.parent).send({ phone: '+216 98 111 222' })
    expect(res.status).toBe(200)
    expect(res.body.data.phone).toBe('+216 98 111 222')
    const list = await auth(request(app).get(url()), ctx.parent)
    expect(list.body.data).toHaveLength(2)
  })

  test('effacer l\'email (chaîne vide) → champ supprimé', async () => {
    const res = await auth(request(app).put(url(contactId)), ctx.parent).send({ email: '' })
    expect(res.status).toBe(200)
    expect(res.body.data.email).toBeUndefined()
  })

  test('autre parent → 404', async () => {
    const res = await auth(request(app).put(url(contactId)), ctx.otherParent).send({ name: 'pirate' })
    expect(res.status).toBe(404)
  })

  test('suppression pédiatre → 403, parent → 200', async () => {
    expect((await auth(request(app).delete(url(contactId)), ctx.pediatre)).status).toBe(403)
    expect((await auth(request(app).delete(url(contactId)), ctx.parent)).status).toBe(200)
  })
})
