/**
 * Utilitaires partagés par les tests des modules "dossier santé"
 * (étapes, allergies/antécédents, journal, contacts médicaux).
 * Crée un parent, un enfant, un pédiatre assigné et un pédiatre non assigné.
 */
const request = require('supertest')
const app = require('../../app')
const User = require('../../models/User')
const Child = require('../../models/Child')
const Appointment = require('../../models/Appointment')

const register = async (email, role, extra = {}) => {
  const res = await request(app).post('/api/auth/register').send({ email, password: 'Test1234', role, ...extra })
  return { token: res.body.data.token, id: res.body.data.user.id }
}

async function setupDossier(prefix) {
  const stamp = Date.now()
  const parent = await register(`test_${prefix}_parent_${stamp}@pedicare.test`, 'parent')
  const otherParent = await register(`test_${prefix}_other_${stamp}@pedicare.test`, 'parent')
  const pediatre = await register(`test_${prefix}_ped_${stamp}@pedicare.test`, 'pediatre', { fullName: 'Test Pédiatre' })
  const otherPediatre = await register(`test_${prefix}_ped2_${stamp}@pedicare.test`, 'pediatre', { fullName: 'Autre Pédiatre' })

  const childRes = await request(app)
    .post('/api/children')
    .set('Authorization', `Bearer ${parent.token}`)
    .send({ firstName: 'TestEnfant', dateOfBirth: '2024-01-01', gender: 'F' })
  const childId = childRes.body.data._id

  // Le pédiatre "suit" l'enfant via un rendez-vous assigné
  await Appointment.create({ childId, type: 'consultation', dateTime: new Date(), pediatreId: pediatre.id })

  return { parent, otherParent, pediatre, otherPediatre, childId }
}

async function teardownDossier(prefix, ctx, Model) {
  if (ctx?.childId) {
    await Model.deleteMany({ childId: ctx.childId })
    await Appointment.deleteMany({ childId: ctx.childId })
  }
  if (ctx?.parent) await Child.deleteMany({ parentId: ctx.parent.id })
  await User.deleteMany({ email: new RegExp(`^test_${prefix}_.*@pedicare\\.test$`) })
}

// Ajoute l'en-tête Authorization
const auth = (req, who) => req.set('Authorization', `Bearer ${who.token}`)

module.exports = { setupDossier, teardownDossier, auth }
