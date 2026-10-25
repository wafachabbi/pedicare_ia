/**
 * Tests unitaires — Questions pour consultation (parent)
 * Couvre : CRUD, tri par priorité, filtre status, ownership, RDV lié, validation, rôles
 */
require('dotenv').config()
const request = require('supertest')
const mongoose = require('mongoose')
const app = require('../../app')
const User = require('../../models/User')
const Child = require('../../models/Child')
const Appointment = require('../../models/Appointment')
const ConsultationQuestion = require('../../models/ConsultationQuestion')

const MONGO_TEST_URI = process.env.MONGO_URI_TEST || process.env.MONGO_URI

let parentToken, parentId
let otherParentToken, otherParentId
let pediatreToken
let childId, secondChildId
let appointmentId, secondChildAppointmentId
let questionId

const register = (data) => request(app).post('/api/auth/register').send({ password: 'Test1234', ...data })
const questionsUrl = (id = childId) => `/api/children/${id}/questions`

beforeAll(async () => {
  await mongoose.connect(MONGO_TEST_URI)
  const stamp = Date.now()

  const parentRes = await register({ email: `test_questions_parent_${stamp}@pedicare.test`, role: 'parent' })
  parentToken = parentRes.body.data.token
  parentId = parentRes.body.data.user.id

  const otherRes = await register({ email: `test_questions_other_${stamp}@pedicare.test`, role: 'parent' })
  otherParentToken = otherRes.body.data.token
  otherParentId = otherRes.body.data.user.id

  const pedRes = await register({ email: `test_questions_ped_${stamp}@pedicare.test`, role: 'pediatre', fullName: 'Dr. Questions', speciality: 'Pédiatrie' })
  pediatreToken = pedRes.body.data.token

  const childRes = await request(app).post('/api/children').set('Authorization', `Bearer ${parentToken}`)
    .send({ firstName: 'QuestionsEnfant', dateOfBirth: '2023-02-20', gender: 'F' })
  childId = childRes.body.data._id

  const secondRes = await request(app).post('/api/children').set('Authorization', `Bearer ${parentToken}`)
    .send({ firstName: 'QuestionsFrere', dateOfBirth: '2020-11-05', gender: 'M' })
  secondChildId = secondRes.body.data._id

  const future = new Date(Date.now() + 10 * 864e5).toISOString()
  const apptRes = await request(app).post(`/api/children/${childId}/appointments`).set('Authorization', `Bearer ${parentToken}`)
    .send({ type: 'consultation', dateTime: future })
  appointmentId = apptRes.body.data._id

  const otherApptRes = await request(app).post(`/api/children/${secondChildId}/appointments`).set('Authorization', `Bearer ${parentToken}`)
    .send({ type: 'exam', dateTime: future })
  secondChildAppointmentId = otherApptRes.body.data._id
})

afterAll(async () => {
  await ConsultationQuestion.deleteMany({ childId: { $in: [childId, secondChildId] } })
  await Appointment.deleteMany({ childId: { $in: [childId, secondChildId] } })
  await Child.deleteMany({ parentId: { $in: [parentId, otherParentId] } })
  await User.deleteMany({ email: /test_questions_.*@pedicare\.test/ })
  await mongoose.connection.close()
})

describe('CRUD questions (parent propriétaire)', () => {
  test('création → 201, parentId issu du token', async () => {
    const res = await request(app).post(questionsUrl()).set('Authorization', `Bearer ${parentToken}`)
      .send({ question: 'Fièvre la nuit, que faire ?', category: 'symptome', priority: 'haute', appointmentId, parentId: otherParentId })

    expect(res.status).toBe(201)
    expect(res.body.data.question).toBe('Fièvre la nuit, que faire ?')
    expect(res.body.data.status).toBe('en_attente')
    expect(res.body.data.appointmentId).toBe(appointmentId)
    expect(res.body.data.parentId).toBe(parentId)
    questionId = res.body.data._id
  })

  test('liste → 200 avec la question', async () => {
    const res = await request(app).get(questionsUrl()).set('Authorization', `Bearer ${parentToken}`)

    expect(res.status).toBe(200)
    expect(res.body.data.map(q => q._id)).toContain(questionId)
  })

  test('modification → 200', async () => {
    const res = await request(app).put(`${questionsUrl()}/${questionId}`).set('Authorization', `Bearer ${parentToken}`)
      .send({ question: 'Fièvre la nuit : quand consulter ?', category: 'traitement' })

    expect(res.status).toBe(200)
    expect(res.body.data.question).toBe('Fièvre la nuit : quand consulter ?')
    expect(res.body.data.category).toBe('traitement')
  })

  test('suppression → 200 puis 404', async () => {
    const created = await request(app).post(questionsUrl()).set('Authorization', `Bearer ${parentToken}`)
      .send({ question: 'À supprimer' })
    const id = created.body.data._id

    const res = await request(app).delete(`${questionsUrl()}/${id}`).set('Authorization', `Bearer ${parentToken}`)
    expect(res.status).toBe(200)

    const again = await request(app).delete(`${questionsUrl()}/${id}`).set('Authorization', `Bearer ${parentToken}`)
    expect(again.status).toBe(404)
  })
})

describe('Tri et filtre', () => {
  test('tri : haute avant normale avant basse', async () => {
    for (const priority of ['basse', 'normale', 'haute', 'basse']) {
      await request(app).post(questionsUrl()).set('Authorization', `Bearer ${parentToken}`)
        .send({ question: `Question ${priority}`, priority })
    }
    const res = await request(app).get(questionsUrl()).set('Authorization', `Bearer ${parentToken}`)

    expect(res.status).toBe(200)
    const rank = { haute: 0, normale: 1, basse: 2 }
    const ranks = res.body.data.map(q => rank[q.priority])
    expect(ranks).toEqual([...ranks].sort((a, b) => a - b))
    expect(res.body.data[0].priority).toBe('haute')
    expect(res.body.data[res.body.data.length - 1].priority).toBe('basse')
  })

  test('?status=traitee ne renvoie que les questions traitées', async () => {
    await request(app).put(`${questionsUrl()}/${questionId}`).set('Authorization', `Bearer ${parentToken}`)
      .send({ status: 'traitee' })

    const res = await request(app).get(`${questionsUrl()}?status=traitee`).set('Authorization', `Bearer ${parentToken}`)

    expect(res.status).toBe(200)
    expect(res.body.data.length).toBeGreaterThan(0)
    expect(res.body.data.every(q => q.status === 'traitee')).toBe(true)
    expect(res.body.data.map(q => q._id)).toContain(questionId)
  })
})

describe('Ownership et rôles', () => {
  test('autre parent : liste → 404', async () => {
    const res = await request(app).get(questionsUrl()).set('Authorization', `Bearer ${otherParentToken}`)
    expect(res.status).toBe(404)
  })

  test('autre parent : création → 404', async () => {
    const res = await request(app).post(questionsUrl()).set('Authorization', `Bearer ${otherParentToken}`)
      .send({ question: 'Intrusion' })
    expect(res.status).toBe(404)
  })

  test('autre parent : modification → 404', async () => {
    const res = await request(app).put(`${questionsUrl()}/${questionId}`).set('Authorization', `Bearer ${otherParentToken}`)
      .send({ question: 'Piraté' })
    expect(res.status).toBe(404)
  })

  test('autre parent : suppression → 404', async () => {
    const res = await request(app).delete(`${questionsUrl()}/${questionId}`).set('Authorization', `Bearer ${otherParentToken}`)
    expect(res.status).toBe(404)
    expect(await ConsultationQuestion.exists({ _id: questionId })).toBeTruthy()
  })

  test('un pédiatre → 403', async () => {
    const res = await request(app).get(questionsUrl()).set('Authorization', `Bearer ${pediatreToken}`)
    expect(res.status).toBe(403)
  })

  test('sans token → 401', async () => {
    const res = await request(app).get(questionsUrl())
    expect(res.status).toBe(401)
  })
})

describe('Validation', () => {
  test('appointmentId d\'un autre enfant à la création → 400', async () => {
    const res = await request(app).post(questionsUrl()).set('Authorization', `Bearer ${parentToken}`)
      .send({ question: 'Mauvais RDV', appointmentId: secondChildAppointmentId })
    expect(res.status).toBe(400)
  })

  test('appointmentId d\'un autre enfant à la modification → 400', async () => {
    const res = await request(app).put(`${questionsUrl()}/${questionId}`).set('Authorization', `Bearer ${parentToken}`)
      .send({ appointmentId: secondChildAppointmentId })
    expect(res.status).toBe(400)
  })

  test('question > 500 caractères → 400', async () => {
    const res = await request(app).post(questionsUrl()).set('Authorization', `Bearer ${parentToken}`)
      .send({ question: 'a'.repeat(501) })
    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('VALIDATION_ERROR')
  })

  test('question manquante → 400', async () => {
    const res = await request(app).post(questionsUrl()).set('Authorization', `Bearer ${parentToken}`)
      .send({ category: 'sommeil' })
    expect(res.status).toBe(400)
  })

  test('priority invalide à la création → 400', async () => {
    const res = await request(app).post(questionsUrl()).set('Authorization', `Bearer ${parentToken}`)
      .send({ question: 'Priorité ?', priority: 'urgente' })
    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('VALIDATION_ERROR')
  })

  test('priority invalide à la modification → 400', async () => {
    const res = await request(app).put(`${questionsUrl()}/${questionId}`).set('Authorization', `Bearer ${parentToken}`)
      .send({ priority: 'urgente' })
    expect(res.status).toBe(400)
  })
})
