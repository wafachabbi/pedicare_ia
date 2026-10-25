/**
 * Tests unitaires — Fiche consultation IA
 * Groq est mocké : aucun appel réseau.
 * Couvre : génération, anonymisation du prompt, cache par inputHash, erreurs IA, partage pédiatre, ownership
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
const User = require('../../models/User')
const Child = require('../../models/Child')
const Vaccination = require('../../models/Vaccination')
const Measurement = require('../../models/Measurement')
const Appointment = require('../../models/Appointment')
const ConsultationQuestion = require('../../models/ConsultationQuestion')
const ConsultationSheet = require('../../models/ConsultationSheet')

const MONGO_TEST_URI = process.env.MONGO_URI_TEST || process.env.MONGO_URI
const mockCreate = Groq.mockCreate

const FIRST_NAME = 'Zéphyrine'
const DATE_OF_BIRTH = '2024-05-17'
const RAW_LLM_TEXT = 'SECRET_RAW_LLM_OUTPUT'

const VALID_SHEET = {
  resume: 'Enfant de 2 ans vu pour un suivi. Vaccinations à jour. Questions sur le sommeil.',
  motifs: ['Suivi de croissance'],
  antecedents: ['ROR reçu'],
  questionsParent: ["L'enfant dort-il assez ?"],
  pointsAttention: ['Vérifier le rythme de sommeil']
}

const completion = (content) => ({
  choices: [{ message: { content } }],
  usage: { prompt_tokens: 321, completion_tokens: 123 }
})

let parentToken, parentId
let otherParentToken, otherParentId
let pediatreToken, pediatreId
let otherPediatreToken, otherPediatreId
let childId, appointmentId
let sheetId

const register = (data) => request(app).post('/api/auth/register').send({ password: 'Test1234', ...data })
const generate = (token = parentToken, body = {}) =>
  request(app).post(`/api/consultation-sheets/children/${childId}`).set('Authorization', `Bearer ${token}`).send(body)
const addQuestion = (question, priority = 'normale') =>
  request(app).post(`/api/children/${childId}/questions`).set('Authorization', `Bearer ${parentToken}`)
    .send({ question, category: 'sommeil', priority })

// Tout le texte envoyé au LLM lors d'un appel donné
const promptOf = (callIndex) => mockCreate.mock.calls[callIndex][0].messages.map(m => m.content).join('\n')

beforeAll(async () => {
  await mongoose.connect(MONGO_TEST_URI)
  const stamp = Date.now()

  const parentRes = await register({ email: `test_sheet_parent_${stamp}@pedicare.test`, role: 'parent' })
  parentToken = parentRes.body.data.token
  parentId = parentRes.body.data.user.id

  const otherRes = await register({ email: `test_sheet_other_${stamp}@pedicare.test`, role: 'parent' })
  otherParentToken = otherRes.body.data.token
  otherParentId = otherRes.body.data.user.id

  const pedRes = await register({ email: `test_sheet_ped_${stamp}@pedicare.test`, role: 'pediatre', fullName: 'Dr. Fiche Un', speciality: 'Pédiatrie' })
  pediatreToken = pedRes.body.data.token
  pediatreId = pedRes.body.data.user.id

  const otherPedRes = await register({ email: `test_sheet_ped2_${stamp}@pedicare.test`, role: 'pediatre', fullName: 'Dr. Fiche Deux', speciality: 'Pédiatrie' })
  otherPediatreToken = otherPedRes.body.data.token
  otherPediatreId = otherPedRes.body.data.user.id

  const childRes = await request(app).post('/api/children').set('Authorization', `Bearer ${parentToken}`)
    .send({ firstName: FIRST_NAME, dateOfBirth: DATE_OF_BIRTH, gender: 'F', bloodType: 'A+', allergies: `${FIRST_NAME} est allergique aux arachides` })
  childId = childRes.body.data._id

  await request(app).post(`/api/children/${childId}/vaccinations`).set('Authorization', `Bearer ${parentToken}`)
    .send({ vaccineName: 'ROR', administeredAt: '2025-05-20', lotNumber: 'LOT-XYZ', practitioner: 'Dr. Martin' })

  await Measurement.create({ childId, date: new Date('2026-09-30'), weight: 11.2, height: 84, headCircumference: 47 })

  const apptRes = await request(app).post(`/api/children/${childId}/appointments`).set('Authorization', `Bearer ${parentToken}`)
    .send({ type: 'consultation', dateTime: new Date(Date.now() + 7 * 864e5).toISOString(), pediatreId, practitioner: 'Dr. Fiche Un' })
  appointmentId = apptRes.body.data._id

  await addQuestion(`Est-ce que ${FIRST_NAME.toUpperCase()} dort assez ?`, 'haute')
})

beforeEach(() => {
  mockCreate.mockReset()
  mockCreate.mockResolvedValue(completion(JSON.stringify(VALID_SHEET)))
})

afterAll(async () => {
  await ConsultationSheet.deleteMany({ childId })
  await ConsultationQuestion.deleteMany({ childId })
  await Measurement.deleteMany({ childId })
  await Vaccination.deleteMany({ childId })
  await Appointment.deleteMany({ childId })
  await Child.deleteMany({ parentId: { $in: [parentId, otherParentId] } })
  await User.deleteMany({ email: /test_sheet_.*@pedicare\.test/ })
  await mongoose.connection.close()
})

describe('POST /api/consultation-sheets/children/:childId — génération', () => {
  test('génération → 201, content complet, meta renseignée', async () => {
    const res = await generate()

    expect(res.status).toBe(201)
    expect(res.body.data.content).toEqual(VALID_SHEET)
    expect(typeof res.body.data.meta.model).toBe('string')
    expect(typeof res.body.data.meta.latencyMs).toBe('number')
    expect(res.body.data.meta.promptTokens).toBe(321)
    expect(res.body.data.meta.completionTokens).toBe(123)
    expect(res.body.data.meta.fromCache).toBe(false)
    expect(res.body.data.appointmentId).toBe(appointmentId)
    expect(res.body.data.pediatreId).toBe(pediatreId)
    expect(mockCreate).toHaveBeenCalledTimes(1)
    sheetId = res.body.data._id
  })

  test('paramètres d\'appel : temperature 0.3, max_tokens 700', async () => {
    await addQuestion('Question pour vérifier les paramètres')
    await generate()

    const params = mockCreate.mock.calls[0][0]
    expect(params.temperature).toBe(0.3)
    expect(params.max_tokens).toBe(700)
  })
})

describe('Anonymisation du prompt', () => {
  let prompt

  beforeAll(async () => {
    mockCreate.mockReset()
    mockCreate.mockResolvedValue(completion(JSON.stringify(VALID_SHEET)))
    await addQuestion(`${FIRST_NAME} refuse les légumes`, 'basse')
    const res = await generate()
    expect(res.status).toBe(201)
    prompt = promptOf(0)
  })

  test('ne contient pas le prénom de l\'enfant (toutes casses)', () => {
    expect(prompt.toLowerCase()).not.toContain(FIRST_NAME.toLowerCase())
  })

  test('ne contient pas la date de naissance exacte', () => {
    expect(prompt).not.toContain(DATE_OF_BIRTH)
    expect(prompt).not.toContain('17/05/2024')
    expect(prompt).not.toContain('2024-05-17')
  })

  test('ne contient aucun ObjectId', () => {
    expect(prompt).not.toMatch(/[a-f0-9]{24}/i)
    ;[childId, parentId, pediatreId, appointmentId].forEach(id => expect(prompt).not.toContain(id))
  })

  test('ne contient ni numéro de lot ni nom de praticien', () => {
    expect(prompt).not.toContain('LOT-XYZ')
    expect(prompt).not.toContain('Dr. Martin')
    expect(prompt).not.toContain('Dr. Fiche Un')
  })

  test('prénom écrit dans une question ou les allergies → "l\'enfant"', () => {
    expect(prompt).toContain("Est-ce que l'enfant dort assez ?")
    expect(prompt).toContain("l'enfant refuse les légumes")
    expect(prompt).toContain("l'enfant est allergique aux arachides")
  })

  test('contient les données utiles anonymisées', () => {
    expect(prompt).toMatch(/\d+ mois|\d+ ans/)
    expect(prompt).toContain('ROR')
    expect(prompt).toContain('05/2025')
    expect(prompt).toContain('11.2')
  })
})

describe('Cache par inputHash', () => {
  test('2e génération identique → fromCache true, LLM appelé une seule fois', async () => {
    await addQuestion('Question pour le test du cache')
    const first = await generate()
    expect(first.status).toBe(201)

    const second = await generate()
    expect(second.status).toBe(200)
    expect(second.body.data.meta.fromCache).toBe(true)
    expect(second.body.data._id).toBe(first.body.data._id)
    expect(mockCreate).toHaveBeenCalledTimes(1)
  })

  test('nouvelle question → nouvel appel au LLM', async () => {
    await generate() // déjà en cache
    expect(mockCreate).toHaveBeenCalledTimes(0)

    await addQuestion('Nouvelle question après génération')
    const res = await generate()
    expect(res.status).toBe(201)
    expect(res.body.data.meta.fromCache).toBe(false)
    expect(mockCreate).toHaveBeenCalledTimes(1)
  })
})

describe('Erreurs IA', () => {
  let consoleSpy
  beforeAll(() => { consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {}) })
  afterAll(() => consoleSpy.mockRestore())

  test('réponse non-JSON → 502 AI_ERROR sans texte brut du LLM', async () => {
    await addQuestion('Question pour le test non-JSON')
    mockCreate.mockResolvedValue(completion(`Désolé, je ne peux pas répondre. ${RAW_LLM_TEXT}`))

    const res = await generate()
    expect(res.status).toBe(502)
    expect(res.body.error.code).toBe('AI_ERROR')
    expect(JSON.stringify(res.body)).not.toContain(RAW_LLM_TEXT)
  })

  test('JSON sans resume → 502 AI_ERROR', async () => {
    mockCreate.mockResolvedValue(completion(JSON.stringify({ motifs: ['x'] })))

    const res = await generate()
    expect(res.status).toBe(502)
    expect(res.body.error.code).toBe('AI_ERROR')
  })

  test('erreur Groq 429 → 502 AI_ERROR sans message brut', async () => {
    mockCreate.mockRejectedValue(Object.assign(new Error(`Rate limit ${RAW_LLM_TEXT}`), { status: 429 }))

    const res = await generate()
    expect(res.status).toBe(502)
    expect(res.body.error.code).toBe('AI_ERROR')
    expect(JSON.stringify(res.body)).not.toContain(RAW_LLM_TEXT)
    expect(JSON.stringify(res.body)).not.toContain(process.env.GROQ_API_KEY || 'no-key')
  })

  test('aucune fiche enregistrée après un échec', async () => {
    const before = await ConsultationSheet.countDocuments({ childId })
    mockCreate.mockResolvedValue(completion('pas du json'))
    await generate()
    expect(await ConsultationSheet.countDocuments({ childId })).toBe(before)
  })
})

describe('Partage pédiatre', () => {
  test('le pédiatre du RDV voit la fiche dans /shared', async () => {
    const res = await request(app).get('/api/consultation-sheets/shared').set('Authorization', `Bearer ${pediatreToken}`)

    expect(res.status).toBe(200)
    const sheet = res.body.data.find(s => s._id === sheetId)
    expect(sheet).toBeDefined()
    expect(sheet.childId.firstName).toBe(FIRST_NAME)
  })

  test('le pédiatre du RDV lit la fiche → 200', async () => {
    const res = await request(app).get(`/api/consultation-sheets/${sheetId}`).set('Authorization', `Bearer ${pediatreToken}`)
    expect(res.status).toBe(200)
  })

  test('un autre pédiatre ne la voit pas dans /shared', async () => {
    const res = await request(app).get('/api/consultation-sheets/shared').set('Authorization', `Bearer ${otherPediatreToken}`)

    expect(res.status).toBe(200)
    expect(res.body.data.map(s => s._id)).not.toContain(sheetId)
  })

  test('un autre pédiatre → 404 sur /:id', async () => {
    const res = await request(app).get(`/api/consultation-sheets/${sheetId}`).set('Authorization', `Bearer ${otherPediatreToken}`)
    expect(res.status).toBe(404)
  })

  test('un parent ne peut pas appeler /shared → 403', async () => {
    const res = await request(app).get('/api/consultation-sheets/shared').set('Authorization', `Bearer ${parentToken}`)
    expect(res.status).toBe(403)
  })
})

describe('Ownership parent', () => {
  test('le parent liste les fiches de son enfant', async () => {
    const res = await request(app).get(`/api/consultation-sheets/children/${childId}`).set('Authorization', `Bearer ${parentToken}`)

    expect(res.status).toBe(200)
    expect(res.body.data.map(s => s._id)).toContain(sheetId)
  })

  test('autre parent : génération → 404, LLM non appelé', async () => {
    const res = await generate(otherParentToken)
    expect(res.status).toBe(404)
    expect(mockCreate).not.toHaveBeenCalled()
  })

  test('autre parent : liste → 404', async () => {
    const res = await request(app).get(`/api/consultation-sheets/children/${childId}`).set('Authorization', `Bearer ${otherParentToken}`)
    expect(res.status).toBe(404)
  })

  test('autre parent : lecture → 404', async () => {
    const res = await request(app).get(`/api/consultation-sheets/${sheetId}`).set('Authorization', `Bearer ${otherParentToken}`)
    expect(res.status).toBe(404)
  })

  test('autre parent : suppression → 404', async () => {
    const res = await request(app).delete(`/api/consultation-sheets/${sheetId}`).set('Authorization', `Bearer ${otherParentToken}`)
    expect(res.status).toBe(404)
    expect(await ConsultationSheet.exists({ _id: sheetId })).toBeTruthy()
  })

  test('appointmentId d\'un RDV inexistant → 400', async () => {
    const res = await generate(parentToken, { appointmentId: new mongoose.Types.ObjectId().toString() })
    expect(res.status).toBe(400)
  })

  test('le parent supprime sa fiche → 200 puis 404', async () => {
    const res = await request(app).delete(`/api/consultation-sheets/${sheetId}`).set('Authorization', `Bearer ${parentToken}`)
    expect(res.status).toBe(200)

    const again = await request(app).get(`/api/consultation-sheets/${sheetId}`).set('Authorization', `Bearer ${parentToken}`)
    expect(again.status).toBe(404)
  })

  test('sans token → 401', async () => {
    const res = await request(app).post(`/api/consultation-sheets/children/${childId}`)
    expect(res.status).toBe(401)
  })
})
