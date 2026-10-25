/**
 * Tests unitaires — Notes pédiatre
 * Couvre : CRUD, patient = RDV existant, validation, IDOR, isolation entre pédiatres, rôles
 */
require('dotenv').config()
const request = require('supertest')
const mongoose = require('mongoose')
const app = require('../../app')
const User = require('../../models/User')
const Child = require('../../models/Child')
const Appointment = require('../../models/Appointment')
const PediatreNote = require('../../models/PediatreNote')

const MONGO_TEST_URI = process.env.MONGO_URI_TEST || process.env.MONGO_URI

let parentToken, parentId
let pediatreToken, pediatreId
let otherPediatreToken, otherPediatreId
let patientId, otherChildId
let noteId

const register = (data) => request(app).post('/api/auth/register').send({ password: 'Test1234', ...data })

beforeAll(async () => {
  await mongoose.connect(MONGO_TEST_URI)
  const stamp = Date.now()

  const parentRes = await register({ email: `test_notes_parent_${stamp}@pedicare.test`, role: 'parent' })
  parentToken = parentRes.body.data.token
  parentId = parentRes.body.data.user.id

  const pedRes = await register({ email: `test_notes_ped_${stamp}@pedicare.test`, role: 'pediatre', fullName: 'Dr. Notes Un', speciality: 'Pédiatrie' })
  pediatreToken = pedRes.body.data.token
  pediatreId = pedRes.body.data.user.id

  const otherPedRes = await register({ email: `test_notes_ped2_${stamp}@pedicare.test`, role: 'pediatre', fullName: 'Dr. Notes Deux', speciality: 'Pédiatrie' })
  otherPediatreToken = otherPedRes.body.data.token
  otherPediatreId = otherPedRes.body.data.user.id

  // Enfant patient (RDV avec le pédiatre 1) et enfant sans RDV
  const patientRes = await request(app).post('/api/children').set('Authorization', `Bearer ${parentToken}`)
    .send({ firstName: 'NotesPatient', dateOfBirth: '2022-04-10', gender: 'M' })
  patientId = patientRes.body.data._id

  const otherChildRes = await request(app).post('/api/children').set('Authorization', `Bearer ${parentToken}`)
    .send({ firstName: 'NotesSansRdv', dateOfBirth: '2021-09-03', gender: 'F' })
  otherChildId = otherChildRes.body.data._id

  await request(app).post(`/api/children/${patientId}/appointments`).set('Authorization', `Bearer ${parentToken}`)
    .send({ type: 'consultation', dateTime: new Date(Date.now() + 7 * 864e5).toISOString(), pediatreId })
})

afterAll(async () => {
  await PediatreNote.deleteMany({ pediatreId: { $in: [pediatreId, otherPediatreId] } })
  await Appointment.deleteMany({ childId: { $in: [patientId, otherChildId] } })
  await Child.deleteMany({ parentId })
  await User.deleteMany({ email: /test_notes_.*@pedicare\.test/ })
  await mongoose.connection.close()
})

describe('POST /api/notes', () => {
  test('note sur son patient (RDV existant) → 201', async () => {
    const res = await request(app).post('/api/notes').set('Authorization', `Bearer ${pediatreToken}`)
      .send({ childId: patientId, title: 'Contrôle 2 ans', content: 'RAS', category: 'suivi' })

    expect(res.status).toBe(201)
    expect(res.body.data.title).toBe('Contrôle 2 ans')
    expect(res.body.data.pediatreId).toBe(pediatreId)
    noteId = res.body.data._id
  })

  test('enfant sans RDV avec ce pédiatre → 403', async () => {
    const res = await request(app).post('/api/notes').set('Authorization', `Bearer ${pediatreToken}`)
      .send({ childId: otherChildId, title: 'Titre', content: 'Contenu' })

    expect(res.status).toBe(403)
    expect(res.body.error.code).toBe('FORBIDDEN')
  })

  test('title manquant → 400', async () => {
    const res = await request(app).post('/api/notes').set('Authorization', `Bearer ${pediatreToken}`)
      .send({ childId: patientId, content: 'Contenu' })

    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('VALIDATION_ERROR')
  })

  test('title > 100 caractères → 400', async () => {
    const res = await request(app).post('/api/notes').set('Authorization', `Bearer ${pediatreToken}`)
      .send({ childId: patientId, title: 'a'.repeat(101), content: 'Contenu' })

    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('VALIDATION_ERROR')
  })

  test('pediatreId du body ignoré (IDOR) → note du pédiatre connecté', async () => {
    const res = await request(app).post('/api/notes').set('Authorization', `Bearer ${pediatreToken}`)
      .send({ childId: patientId, title: 'IDOR', content: 'Contenu', pediatreId: otherPediatreId })

    expect(res.status).toBe(201)
    expect(res.body.data.pediatreId).toBe(pediatreId)
    const saved = await PediatreNote.findById(res.body.data._id).lean()
    expect(saved.pediatreId.toString()).toBe(pediatreId)
  })
})

describe('GET /api/notes', () => {
  test('le pédiatre liste ses notes → 200', async () => {
    const res = await request(app).get('/api/notes').set('Authorization', `Bearer ${pediatreToken}`)

    expect(res.status).toBe(200)
    expect(res.body.data.map(n => n._id)).toContain(noteId)
  })

  test('un parent → 403', async () => {
    const res = await request(app).get('/api/notes').set('Authorization', `Bearer ${parentToken}`)
    expect(res.status).toBe(403)
  })

  test('sans token → 401', async () => {
    const res = await request(app).get('/api/notes')
    expect(res.status).toBe(401)
  })

  test('id invalide → 404', async () => {
    const res = await request(app).get('/api/notes/pas-un-id').set('Authorization', `Bearer ${pediatreToken}`)
    expect(res.status).toBe(404)
  })
})

describe('Isolation entre pédiatres', () => {
  test('2e pédiatre ne voit pas la note dans sa liste', async () => {
    const res = await request(app).get('/api/notes').set('Authorization', `Bearer ${otherPediatreToken}`)

    expect(res.status).toBe(200)
    expect(res.body.data.map(n => n._id)).not.toContain(noteId)
  })

  test('2e pédiatre ne peut pas lire la note → 404', async () => {
    const res = await request(app).get(`/api/notes/${noteId}`).set('Authorization', `Bearer ${otherPediatreToken}`)
    expect(res.status).toBe(404)
  })

  test('2e pédiatre ne peut pas modifier la note → 404', async () => {
    const res = await request(app).put(`/api/notes/${noteId}`).set('Authorization', `Bearer ${otherPediatreToken}`)
      .send({ title: 'Piraté' })

    expect(res.status).toBe(404)
    const saved = await PediatreNote.findById(noteId).lean()
    expect(saved.title).toBe('Contrôle 2 ans')
  })

  test('2e pédiatre ne peut pas supprimer la note → 404', async () => {
    const res = await request(app).delete(`/api/notes/${noteId}`).set('Authorization', `Bearer ${otherPediatreToken}`)

    expect(res.status).toBe(404)
    expect(await PediatreNote.exists({ _id: noteId })).toBeTruthy()
  })
})

describe('PUT / DELETE /api/notes/:id (propriétaire)', () => {
  test('mise à jour → 200', async () => {
    const res = await request(app).put(`/api/notes/${noteId}`).set('Authorization', `Bearer ${pediatreToken}`)
      .send({ title: 'Contrôle modifié' })

    expect(res.status).toBe(200)
    expect(res.body.data.title).toBe('Contrôle modifié')
  })

  test('suppression → 200 puis 404', async () => {
    const res = await request(app).delete(`/api/notes/${noteId}`).set('Authorization', `Bearer ${pediatreToken}`)
    expect(res.status).toBe(200)

    const again = await request(app).delete(`/api/notes/${noteId}`).set('Authorization', `Bearer ${pediatreToken}`)
    expect(again.status).toBe(404)
  })
})

describe('GET /api/notes/patients', () => {
  test('ne renvoie que les patients du pédiatre', async () => {
    const res = await request(app).get('/api/notes/patients').set('Authorization', `Bearer ${pediatreToken}`)

    expect(res.status).toBe(200)
    const ids = res.body.data.map(p => p._id)
    expect(ids).toContain(patientId)
    expect(ids).not.toContain(otherChildId)
  })

  test('un autre pédiatre ne voit pas ce patient', async () => {
    const res = await request(app).get('/api/notes/patients').set('Authorization', `Bearer ${otherPediatreToken}`)

    expect(res.status).toBe(200)
    expect(res.body.data.map(p => p._id)).not.toContain(patientId)
  })
})
