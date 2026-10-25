const MedicalContact = require('../models/MedicalContact')
const { canAccessChild } = require('../services/childAccess')

const FIELDS = ['type', 'name', 'specialty', 'phone', 'email', 'adresse', 'notes']

// Ne garde que les champs modifiables (empêche de changer childId)
const pick = (body) => Object.fromEntries(FIELDS.filter(k => body[k] !== undefined).map(k => [k, body[k]]))

const notFound = (res, message = 'Enfant introuvable') =>
  res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message } })

// GET /api/children/:childId/medical-contacts
const getMedicalContacts = async (req, res, next) => {
  try {
    if (!await canAccessChild(req.params.childId, req.user)) return notFound(res)
    const contacts = await MedicalContact.find({ childId: req.params.childId }).sort({ type: 1, name: 1 })
    res.json({ success: true, data: contacts })
  } catch (err) { next(err) }
}

// POST /api/children/:childId/medical-contacts
const createMedicalContact = async (req, res, next) => {
  try {
    if (!await canAccessChild(req.params.childId, req.user)) return notFound(res)
    const data = pick(req.body)
    if (!data.type || !data.name) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Type et nom requis' } })
    }
    if (!data.email) delete data.email // email vide ne doit pas déclencher la validation du format
    const contact = await MedicalContact.create({ ...data, childId: req.params.childId })
    res.status(201).json({ success: true, data: contact })
  } catch (err) { next(err) }
}

// PUT /api/children/:childId/medical-contacts/:id
const updateMedicalContact = async (req, res, next) => {
  try {
    if (!await canAccessChild(req.params.childId, req.user)) return notFound(res)
    const data = pick(req.body)
    const update = { $set: data }
    if (data.email === '') {
      delete data.email
      update.$unset = { email: 1 }
    }
    const contact = await MedicalContact.findOneAndUpdate(
      { _id: req.params.id, childId: req.params.childId },
      update,
      { new: true, runValidators: true }
    )
    if (!contact) return notFound(res, 'Contact médical introuvable')
    res.json({ success: true, data: contact })
  } catch (err) { next(err) }
}

// DELETE /api/children/:childId/medical-contacts/:id
const deleteMedicalContact = async (req, res, next) => {
  try {
    if (!await canAccessChild(req.params.childId, req.user)) return notFound(res)
    const contact = await MedicalContact.findOneAndDelete({ _id: req.params.id, childId: req.params.childId })
    if (!contact) return notFound(res, 'Contact médical introuvable')
    res.json({ success: true, message: 'Contact médical supprimé' })
  } catch (err) { next(err) }
}

module.exports = { getMedicalContacts, createMedicalContact, updateMedicalContact, deleteMedicalContact }
