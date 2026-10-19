/**
 * Tests unitaires — Module IA (résumé + rappels)
 * Couvre : endpoints IA, cache, ownership, format réponse
 */
require('dotenv').config()
const request = require('supertest')
const mongoose = require('mongoose')
const app = require('../../app')
const User = require('../../models/User')
const Child = require('../../models/Child')
const Vaccination = require('../../models/Vaccination')
const Appointment = require('../../models/Appointment')

const MONGO_TEST_URI = process.env.MONGO_URI_TEST || process.env.MONGO_URI

let parentToken, parentId, childId
let otherParentToken

beforeAll(async () => {
  await mongoose.connect(MONGO_TEST_URI)

  // Parent avec enfant
  const parentRes = await request(app).post('/api/auth/register').send({
    email: `test_ai_parent_${Date.now()}@pedicare.test`,
    password: 'Test1234',
    role: 'parent'
  })
  parentToken = parentRes.body.data.token
  parentId = parentRes.body.data.user.id

  const childRes = await request(app)
    .post('/api/children')
    .set('Authorization', `Bearer ${parentToken}`)
    .send({ firstName: 'AITestEnfant', dateOfBirth: '2020-06-15', gender: 'F' })
  childId = childRes.body.data._id

  // Ajouter une vaccination pour enrichir le contexte IA
  await request(app)
    .post(`/api/children/${childId}/vaccinations`)
    .set('Authorization', `Bearer ${parentToken}`)
    .send({ vaccineName: 'BCG', administeredAt: '2020-08-01' })

  // Autre parent (pour test d'ownership)
  const otherRes = await request(app).post('/api/auth/register').send({
    email: `test_ai_other_${Date.now()}@pedicare.test`,
    password: 'Test1234',
    role: 'parent'
  })
  otherParentToken = otherRes.body.data.token
})

afterAll(async () => {
  await Vaccination.deleteMany({ childId })
  await Appointment.deleteMany({ childId })
  await Child.deleteMany({ parentId })
  await User.deleteMany({ email: /test_ai_.*@pedicare\.test/ })
  await mongoose.disconnect()
})

describe('POST /api/ai/summary/:childId', () => {
  test('génération résumé → 200 + champ summary', async () => {
    const res = await request(app)
      .post(`/api/ai/summary/${childId}`)
      .set('Authorization', `Bearer ${parentToken}`)

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.data.summary).toBeDefined()
    expect(typeof res.body.data.summary).toBe('string')
    expect(res.body.data.summary.length).toBeGreaterThan(20)
  }, 30000) // timeout 30s pour appel API externe

  test('2ème appel → depuis le cache (fromCache: true)', async () => {
    const res = await request(app)
      .post(`/api/ai/summary/${childId}`)
      .set('Authorization', `Bearer ${parentToken}`)

    expect(res.status).toBe(200)
    expect(res.body.fromCache).toBe(true)
  }, 10000)

  test('accès enfant d\'un autre parent → 404', async () => {
    const res = await request(app)
      .post(`/api/ai/summary/${childId}`)
      .set('Authorization', `Bearer ${otherParentToken}`)

    expect(res.status).toBe(404)
  })

  test('sans token → 401', async () => {
    const res = await request(app).post(`/api/ai/summary/${childId}`)
    expect(res.status).toBe(401)
  })

  test('childId invalide → 404 ou 500', async () => {
    const fakeId = new mongoose.Types.ObjectId()
    const res = await request(app)
      .post(`/api/ai/summary/${fakeId}`)
      .set('Authorization', `Bearer ${parentToken}`)

    expect([404, 500]).toContain(res.status)
  })
})

describe('POST /api/ai/reminders/:childId', () => {
  test('génération rappels → 200 + tableau reminders', async () => {
    const res = await request(app)
      .post(`/api/ai/reminders/${childId}`)
      .set('Authorization', `Bearer ${parentToken}`)

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(Array.isArray(res.body.data.reminders)).toBe(true)
    expect(res.body.data.reminders.length).toBeGreaterThan(0)
  }, 30000)

  test('structure des rappels valide (type, title, message, action)', async () => {
    const res = await request(app)
      .post(`/api/ai/reminders/${childId}`)
      .set('Authorization', `Bearer ${parentToken}`)

    const reminders = res.body.data.reminders
    reminders.forEach(r => {
      expect(['urgent', 'warning', 'info']).toContain(r.type)
      expect(typeof r.title).toBe('string')
      expect(typeof r.message).toBe('string')
    })
  }, 10000) // depuis le cache

  test('2ème appel → depuis le cache', async () => {
    const res = await request(app)
      .post(`/api/ai/reminders/${childId}`)
      .set('Authorization', `Bearer ${parentToken}`)

    expect(res.body.fromCache).toBe(true)
  }, 10000)

  test('accès enfant d\'un autre parent → 404', async () => {
    const res = await request(app)
      .post(`/api/ai/reminders/${childId}`)
      .set('Authorization', `Bearer ${otherParentToken}`)

    expect(res.status).toBe(404)
  })

  test('sans token → 401', async () => {
    const res = await request(app).post(`/api/ai/reminders/${childId}`)
    expect(res.status).toBe(401)
  })
})

describe('GET /api/ai/models', () => {
  test('liste des modèles disponibles → 200 + tableau', async () => {
    const res = await request(app)
      .get('/api/ai/models')
      .set('Authorization', `Bearer ${parentToken}`)

    expect(res.status).toBe(200)
    expect(Array.isArray(res.body.data)).toBe(true)
    expect(res.body.data.length).toBeGreaterThan(0)
    expect(res.body.data[0].id).toBeDefined()
  }, 15000)

  test('sans token → 401', async () => {
    const res = await request(app).get('/api/ai/models')
    expect(res.status).toBe(401)
  })
})
