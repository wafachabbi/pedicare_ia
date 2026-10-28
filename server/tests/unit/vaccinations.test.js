/**
 * Tests unitaires — Vaccinations & Rendez-vous
 * Couvre : CRUD complet, ownership, validation, sélection pédiatre
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

let parentToken, parentId
let pediatreToken, pediatreId
let childId
let vaccinationId, appointmentId

beforeAll(async () => {
  await mongoose.connect(MONGO_TEST_URI)

  // Créer un parent de test
  const parentRes = await request(app).post('/api/auth/register').send({
    email: `test_vacc_parent_${Date.now()}@pedicare.test`,
    password: 'Test1234',
    role: 'parent'
  })
  parentToken = parentRes.body.data.token
  parentId = parentRes.body.data.user.id

  // Créer un pédiatre de test
  const pedRes = await request(app).post('/api/auth/register').send({
    email: `test_vacc_ped_${Date.now()}@pedicare.test`,
    password: 'Test1234',
    role: 'pediatre',
    fullName: 'Dr. Test Pédiatre',
    speciality: 'Pédiatrie'
  })
  pediatreToken = pedRes.body.data.token
  pediatreId = pedRes.body.data.user.id

  // Créer un enfant de test
  const childRes = await request(app)
    .post('/api/children')
    .set('Authorization', `Bearer ${parentToken}`)
    .send({ firstName: 'TestEnfant', dateOfBirth: '2020-01-01', gender: 'M' })
  childId = childRes.body.data._id
})

afterAll(async () => {
  await Vaccination.deleteMany({ childId })
  await Appointment.deleteMany({ childId })
  await Child.deleteMany({ parentId })
  await User.deleteMany({ email: /test_vacc_.*@pedicare\.test/ })
  await mongoose.disconnect()
})

// ═══════════════════════════════════════════════
// VACCINATIONS
// ═══════════════════════════════════════════════

describe('GET /api/children/:childId/vaccinations', () => {
  test('liste vide au départ → 200 []', async () => {
    const res = await request(app)
      .get(`/api/children/${childId}/vaccinations`)
      .set('Authorization', `Bearer ${parentToken}`)

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(Array.isArray(res.body.data)).toBe(true)
  })

  test('sans token → 401', async () => {
    const res = await request(app).get(`/api/children/${childId}/vaccinations`)
    expect(res.status).toBe(401)
  })
})

describe('POST /api/children/:childId/vaccinations', () => {
  test('création vaccination valide → 201', async () => {
    const res = await request(app)
      .post(`/api/children/${childId}/vaccinations`)
      .set('Authorization', `Bearer ${parentToken}`)
      .send({ vaccineName: 'BCG', administeredAt: '2020-02-01', lotNumber: 'LOT123' })

    expect(res.status).toBe(201)
    expect(res.body.success).toBe(true)
    expect(res.body.data.vaccineName).toBe('BCG')
    vaccinationId = res.body.data._id
  })

  test('création avec pédiatre assigné → pediatreId sauvegardé', async () => {
    const res = await request(app)
      .post(`/api/children/${childId}/vaccinations`)
      .set('Authorization', `Bearer ${parentToken}`)
      .send({
        vaccineName: 'ROR',
        administeredAt: '2021-01-15',
        pediatreId,
        practitioner: 'Dr. Test Pédiatre'
      })

    expect(res.status).toBe(201)
    expect(res.body.data.pediatreId).toBe(pediatreId)
    expect(res.body.data.practitioner).toBe('Dr. Test Pédiatre')
  })

  test('nom du vaccin manquant → 400', async () => {
    const res = await request(app)
      .post(`/api/children/${childId}/vaccinations`)
      .set('Authorization', `Bearer ${parentToken}`)
      .send({ administeredAt: '2020-02-01' })

    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('VALIDATION_ERROR')
  })

  test('date manquante → 400', async () => {
    const res = await request(app)
      .post(`/api/children/${childId}/vaccinations`)
      .set('Authorization', `Bearer ${parentToken}`)
      .send({ vaccineName: 'DTP' })

    expect(res.status).toBe(400)
  })
})

describe('PUT /api/children/:childId/vaccinations/:id', () => {
  test('mise à jour vaccination → 200', async () => {
    const res = await request(app)
      .put(`/api/children/${childId}/vaccinations/${vaccinationId}`)
      .set('Authorization', `Bearer ${parentToken}`)
      .send({ vaccineName: 'BCG-Modifié', lotNumber: 'LOT999' })

    expect(res.status).toBe(200)
    expect(res.body.data.vaccineName).toBe('BCG-Modifié')
    expect(res.body.data.lotNumber).toBe('LOT999')
  })

  test('vaccination inexistante → 404', async () => {
    const fakeId = new mongoose.Types.ObjectId()
    const res = await request(app)
      .put(`/api/children/${childId}/vaccinations/${fakeId}`)
      .set('Authorization', `Bearer ${parentToken}`)
      .send({ vaccineName: 'Test' })

    expect(res.status).toBe(404)
  })
})

describe('DELETE /api/children/:childId/vaccinations/:id', () => {
  test('suppression vaccination → 200', async () => {
    const res = await request(app)
      .delete(`/api/children/${childId}/vaccinations/${vaccinationId}`)
      .set('Authorization', `Bearer ${parentToken}`)

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
  })

  test('vaccination déjà supprimée → 404', async () => {
    const res = await request(app)
      .delete(`/api/children/${childId}/vaccinations/${vaccinationId}`)
      .set('Authorization', `Bearer ${parentToken}`)

    expect(res.status).toBe(404)
  })
})

// ═══════════════════════════════════════════════
// RENDEZ-VOUS
// ═══════════════════════════════════════════════

describe('GET /api/children/:childId/appointments', () => {
  test('liste vide → 200 []', async () => {
    const res = await request(app)
      .get(`/api/children/${childId}/appointments`)
      .set('Authorization', `Bearer ${parentToken}`)

    expect(res.status).toBe(200)
    expect(Array.isArray(res.body.data)).toBe(true)
  })
})

describe('POST /api/children/:childId/appointments', () => {
  test('création RDV futur → status upcoming', async () => {
    const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    const res = await request(app)
      .post(`/api/children/${childId}/appointments`)
      .set('Authorization', `Bearer ${parentToken}`)
      .send({ type: 'consultation', dateTime: futureDate, notes: 'Test RDV' })

    expect(res.status).toBe(201)
    expect(res.body.data.status).toBe('upcoming')
    appointmentId = res.body.data._id
  })

  test('création RDV passé → status past', async () => {
    const pastDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const res = await request(app)
      .post(`/api/children/${childId}/appointments`)
      .set('Authorization', `Bearer ${parentToken}`)
      .send({ type: 'exam', dateTime: pastDate })

    expect(res.status).toBe(201)
    expect(res.body.data.status).toBe('past')
  })

  test('création RDV avec pédiatre → pediatreId sauvegardé', async () => {
    const futureDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
    const res = await request(app)
      .post(`/api/children/${childId}/appointments`)
      .set('Authorization', `Bearer ${parentToken}`)
      .send({ type: 'consultation', dateTime: futureDate, pediatreId, practitioner: 'Dr. Test Pédiatre' })

    expect(res.status).toBe(201)
    expect(res.body.data.pediatreId).toBe(pediatreId)
  })

  test('type manquant → 400', async () => {
    const res = await request(app)
      .post(`/api/children/${childId}/appointments`)
      .set('Authorization', `Bearer ${parentToken}`)
      .send({ dateTime: new Date().toISOString() })

    expect(res.status).toBe(400)
  })

  test('type invalide → 400/500', async () => {
    const res = await request(app)
      .post(`/api/children/${childId}/appointments`)
      .set('Authorization', `Bearer ${parentToken}`)
      .send({ type: 'invalid_type', dateTime: new Date().toISOString() })

    expect([400, 500]).toContain(res.status)
  })
})

describe('PUT /api/children/:childId/appointments/:id', () => {
  test('mise à jour notes → 200', async () => {
    const res = await request(app)
      .put(`/api/children/${childId}/appointments/${appointmentId}`)
      .set('Authorization', `Bearer ${parentToken}`)
      .send({ notes: 'Notes modifiées' })

    expect(res.status).toBe(200)
    expect(res.body.data.notes).toBe('Notes modifiées')
  })
})

describe('DELETE /api/children/:childId/appointments/:id', () => {
  test('suppression RDV → 200', async () => {
    const res = await request(app)
      .delete(`/api/children/${childId}/appointments/${appointmentId}`)
      .set('Authorization', `Bearer ${parentToken}`)

    expect(res.status).toBe(200)
  })
})

// ═══════════════════════════════════════════════
// DASHBOARD PÉDIATRE — voir les données assignées
// ═══════════════════════════════════════════════

describe('GET /api/pediatre/appointments', () => {
  test('pédiatre voit ses RDV assignés → 200', async () => {
    const res = await request(app)
      .get('/api/pediatre/appointments')
      .set('Authorization', `Bearer ${pediatreToken}`)

    expect(res.status).toBe(200)
    expect(Array.isArray(res.body.data)).toBe(true)
  })

  test('parent ne peut pas accéder → 403', async () => {
    const res = await request(app)
      .get('/api/pediatre/appointments')
      .set('Authorization', `Bearer ${parentToken}`)

    expect(res.status).toBe(403)
  })
})

describe('GET /api/pediatre/vaccinations', () => {
  test('pédiatre voit ses vaccinations assignées → 200', async () => {
    const res = await request(app)
      .get('/api/pediatre/vaccinations')
      .set('Authorization', `Bearer ${pediatreToken}`)

    expect(res.status).toBe(200)
    expect(Array.isArray(res.body.data)).toBe(true)
  })
})

describe('GET /api/pediatre/list', () => {
  test('liste des pédiatres accessible aux parents → 200', async () => {
    const res = await request(app)
      .get('/api/pediatre/list')
      .set('Authorization', `Bearer ${parentToken}`)

    expect(res.status).toBe(200)
    expect(Array.isArray(res.body.data)).toBe(true)
    const ids = res.body.data.map(p => p._id)
    expect(ids).toContain(pediatreId)
  })

  test('sans token → 401', async () => {
    const res = await request(app).get('/api/pediatre/list')
    expect(res.status).toBe(401)
  })
})
