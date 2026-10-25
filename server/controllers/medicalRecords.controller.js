const MedicalRecord = require('../models/MedicalRecord')
const { canAccessChild } = require('../services/childAccess')

const FIELDS = ['type', 'name', 'severity', 'reaction', 'diagnosedAt', 'treatment', 'active', 'notes']

// Ne garde que les champs modifiables (empêche de changer childId)
// Les chaînes vides sont converties en null (ex: severity '' ne passe pas l'enum)
const pick = (body) => Object.fromEntries(
  FIELDS.filter(k => body[k] !== undefined).map(k => [k, body[k] === '' ? null : body[k]])
)

const notFound = (res, message = 'Enfant introuvable') =>
  res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message } })

// GET /api/children/:childId/medical-records?type=allergie|antecedent
const getMedicalRecords = async (req, res, next) => {
  try {
    if (!await canAccessChild(req.params.childId, req.user)) return notFound(res)
    const filter = { childId: req.params.childId }
    if (['allergie', 'antecedent'].includes(req.query.type)) filter.type = req.query.type
    const records = await MedicalRecord.find(filter).sort({ active: -1, createdAt: -1 })
    res.json({ success: true, data: records })
  } catch (err) { next(err) }
}

// POST /api/children/:childId/medical-records
const createMedicalRecord = async (req, res, next) => {
  try {
    if (!await canAccessChild(req.params.childId, req.user)) return notFound(res)
    const data = pick(req.body)
    if (!data.type || !data.name) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Type et nom requis' } })
    }
    const record = await MedicalRecord.create({ ...data, childId: req.params.childId })
    res.status(201).json({ success: true, data: record })
  } catch (err) { next(err) }
}

// PUT /api/children/:childId/medical-records/:id
const updateMedicalRecord = async (req, res, next) => {
  try {
    if (!await canAccessChild(req.params.childId, req.user)) return notFound(res)
    const record = await MedicalRecord.findOneAndUpdate(
      { _id: req.params.id, childId: req.params.childId },
      { $set: pick(req.body) },
      { new: true, runValidators: true }
    )
    if (!record) return notFound(res, 'Élément introuvable')
    res.json({ success: true, data: record })
  } catch (err) { next(err) }
}

// DELETE /api/children/:childId/medical-records/:id
const deleteMedicalRecord = async (req, res, next) => {
  try {
    if (!await canAccessChild(req.params.childId, req.user)) return notFound(res)
    const record = await MedicalRecord.findOneAndDelete({ _id: req.params.id, childId: req.params.childId })
    if (!record) return notFound(res, 'Élément introuvable')
    res.json({ success: true, message: 'Élément supprimé' })
  } catch (err) { next(err) }
}

module.exports = { getMedicalRecords, createMedicalRecord, updateMedicalRecord, deleteMedicalRecord }
