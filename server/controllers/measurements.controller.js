const Measurement = require('../models/Measurement')
const Child = require('../models/Child')

const ownsChild = async (childId, userId) => {
  const child = await Child.findOne({ _id: childId, parentId: userId })
  return !!child
}

// GET /api/children/:childId/measurements
const getMeasurements = async (req, res, next) => {
  try {
    if (!await ownsChild(req.params.childId, req.user.id)) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Enfant introuvable' } })
    }
    const measurements = await Measurement.find({ childId: req.params.childId }).sort({ date: 1 })
    res.json({ success: true, data: measurements })
  } catch (err) { next(err) }
}

// POST /api/children/:childId/measurements
const createMeasurement = async (req, res, next) => {
  try {
    if (!await ownsChild(req.params.childId, req.user.id)) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Enfant introuvable' } })
    }
    const { date, weight, height, headCircumference } = req.body
    if (!date) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'La date est requise' } })
    }
    if (!weight && !height && !headCircumference) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Au moins une mesure est requise (poids, taille ou périmètre crânien)' } })
    }
    const measurement = await Measurement.create({
      childId: req.params.childId,
      date,
      weight: weight || undefined,
      height: height || undefined,
      headCircumference: headCircumference || undefined
    })
    res.status(201).json({ success: true, data: measurement })
  } catch (err) { next(err) }
}

// PUT /api/children/:childId/measurements/:id
const updateMeasurement = async (req, res, next) => {
  try {
    if (!await ownsChild(req.params.childId, req.user.id)) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Enfant introuvable' } })
    }
    const { date, weight, height, headCircumference } = req.body
    const measurement = await Measurement.findOneAndUpdate(
      { _id: req.params.id, childId: req.params.childId },
      { $set: { date, weight: weight || undefined, height: height || undefined, headCircumference: headCircumference || undefined } },
      { new: true, runValidators: true }
    )
    if (!measurement) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Mesure introuvable' } })
    }
    res.json({ success: true, data: measurement })
  } catch (err) { next(err) }
}

// DELETE /api/children/:childId/measurements/:id
const deleteMeasurement = async (req, res, next) => {
  try {
    if (!await ownsChild(req.params.childId, req.user.id)) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Enfant introuvable' } })
    }
    const measurement = await Measurement.findOneAndDelete({ _id: req.params.id, childId: req.params.childId })
    if (!measurement) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Mesure introuvable' } })
    }
    res.json({ success: true, message: 'Mesure supprimée' })
  } catch (err) { next(err) }
}

module.exports = { getMeasurements, createMeasurement, updateMeasurement, deleteMeasurement }
