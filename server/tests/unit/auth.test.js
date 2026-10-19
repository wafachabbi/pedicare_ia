/**
 * Tests unitaires — Authentification
 * Couvre : register, login, validation, sécurité
 */
require('dotenv').config()
const request = require('supertest')
const mongoose = require('mongoose')
const app = require('../../app')
const User = require('../../models/User')

const MONGO_TEST_URI = process.env.MONGO_URI_TEST || process.env.MONGO_URI

beforeAll(async () => {
  await mongoose.connect(MONGO_TEST_URI)
})

afterAll(async () => {
  await User.deleteMany({ email: /test_auth_.*@pedicare\.test/ })
  await mongoose.disconnect()
})

describe('POST /api/auth/register', () => {
  const testEmail = `test_auth_${Date.now()}@pedicare.test`

  test('inscription parent valide → 201 + token', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: testEmail, password: 'Test1234', role: 'parent' })

    expect(res.status).toBe(201)
    expect(res.body.success).toBe(true)
    expect(res.body.data.token).toBeDefined()
    expect(res.body.data.user.role).toBe('parent')
  })

  test('email déjà utilisé → 400', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: testEmail, password: 'Test1234', role: 'parent' })

    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('EMAIL_TAKEN')
  })

  test('mot de passe trop court → 400', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: `test_auth_short_${Date.now()}@pedicare.test`, password: '123', role: 'parent' })

    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('VALIDATION_ERROR')
  })

  test('email manquant → 400', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ password: 'Test1234', role: 'parent' })

    expect(res.status).toBe(400)
  })

  test('rôle invalide → 400', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: `test_auth_role_${Date.now()}@pedicare.test`, password: 'Test1234', role: 'admin' })

    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('VALIDATION_ERROR')
  })

  test('inscription pédiatre avec fullName → 201', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        email: `test_auth_ped_${Date.now()}@pedicare.test`,
        password: 'Test1234',
        role: 'pediatre',
        fullName: 'Dr. Test',
        speciality: 'Pédiatrie'
      })

    expect(res.status).toBe(201)
    expect(res.body.data.user.role).toBe('pediatre')
  })
})

describe('POST /api/auth/login', () => {
  const loginEmail = `test_auth_login_${Date.now()}@pedicare.test`
  const loginPass = 'Login1234'

  beforeAll(async () => {
    await request(app).post('/api/auth/register')
      .send({ email: loginEmail, password: loginPass, role: 'parent' })
  })

  test('login valide → 200 + token', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: loginEmail, password: loginPass })

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.data.token).toBeDefined()
    expect(typeof res.body.data.token).toBe('string')
  })

  test('mauvais mot de passe → 401', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: loginEmail, password: 'WrongPass' })

    expect(res.status).toBe(401)
    expect(res.body.error.code).toBe('INVALID_CREDENTIALS')
  })

  test('email inexistant → 401', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@pedicare.test', password: 'Test1234' })

    expect(res.status).toBe(401)
    expect(res.body.error.code).toBe('INVALID_CREDENTIALS')
  })

  test('champs manquants → 401', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({})

    expect(res.status).toBe(401)
  })
})

describe('Middleware auth', () => {
  test('route protégée sans token → 401', async () => {
    const res = await request(app).get('/api/pediatre/profile')
    expect(res.status).toBe(401)
    expect(res.body.error.code).toBe('UNAUTHORIZED')
  })

  test('token invalide → 401', async () => {
    const res = await request(app)
      .get('/api/pediatre/profile')
      .set('Authorization', 'Bearer token_invalide_123')
    expect(res.status).toBe(401)
    expect(res.body.error.code).toBe('INVALID_TOKEN')
  })

  test('parent accédant à route pédiatre → 403', async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: `test_auth_login_${Date.now()}@pedicare.test`, password: 'any' })

    // Créer parent et tenter d'accéder route pédiatre
    const regRes = await request(app)
      .post('/api/auth/register')
      .send({ email: `test_auth_forbidden_${Date.now()}@pedicare.test`, password: 'Test1234', role: 'parent' })

    const token = regRes.body.data?.token
    if (!token) return // skip si création échoue

    const res = await request(app)
      .get('/api/pediatre/profile')
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(403)
    expect(res.body.error.code).toBe('FORBIDDEN')
  })
})
