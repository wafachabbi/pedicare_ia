const Vaccination = require('../models/Vaccination')
const Child = require('../models/Child')

// Vérifie que l'enfant appartient au parent connecté
const ownsChild = async (childId, userId) => {
  const child = await Child.findOne({ _id: childId, parentId: userId })
  return !!child
}

// GET /api/children/:childId/vaccinations
const getVaccinations = async (req, res, next) => {
  try {
    if (!await ownsChild(req.params.childId, req.user.id)) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Enfant introuvable' } })
    }
    const vaccinations = await Vaccination.find({ childId: req.params.childId }).sort({ administeredAt: -1 })
    res.json({ success: true, data: vaccinations })
  } catch (err) { next(err) }
}

// POST /api/children/:childId/vaccinations
const createVaccination = async (req, res, next) => {
  try {
    if (!await ownsChild(req.params.childId, req.user.id)) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Enfant introuvable' } })
    }
    const { vaccineName, administeredAt, lotNumber } = req.body
    if (!vaccineName || !administeredAt) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Nom du vaccin et date requis' } })
    }
    const vaccination = await Vaccination.create({ childId: req.params.childId, vaccineName, administeredAt, lotNumber })
    res.status(201).json({ success: true, data: vaccination })
  } catch (err) { next(err) }
}

// PUT /api/children/:childId/vaccinations/:id
const updateVaccination = async (req, res, next) => {
  try {
    if (!await ownsChild(req.params.childId, req.user.id)) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Enfant introuvable' } })
    }
    const vaccination = await Vaccination.findOneAndUpdate(
      { _id: req.params.id, childId: req.params.childId },
      { $set: req.body },
      { new: true, runValidators: true }
    )
    if (!vaccination) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Vaccination introuvable' } })
    }
    res.json({ success: true, data: vaccination })
  } catch (err) { next(err) }
}

// DELETE /api/children/:childId/vaccinations/:id
const deleteVaccination = async (req, res, next) => {
  try {
    if (!await ownsChild(req.params.childId, req.user.id)) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Enfant introuvable' } })
    }
    const vaccination = await Vaccination.findOneAndDelete({ _id: req.params.id, childId: req.params.childId })
    if (!vaccination) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Vaccination introuvable' } })
    }
    res.json({ success: true, message: 'Vaccination supprimée' })
  } catch (err) { next(err) }
}

module.exports = { getVaccinations, createVaccination, updateVaccination, deleteVaccination }
