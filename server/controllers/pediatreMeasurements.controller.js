const Measurement = require('../models/Measurement')
const { canAccessChild } = require('../services/childAccess')

// Vérifie que le pédiatre suit bien cet enfant (via rendez-vous ou vaccination)
const checkAccess = async (childId, user, res) => {
  const ok = await canAccessChild(childId, user)
  if (!ok) {
    res.status(403).json({
      success: false,
      error: { code: 'FORBIDDEN', message: 'Cet enfant ne fait pas partie de vos patients' }
    })
    return false
  }
  return true
}

// GET /api/pediatre/patients/:childId/measurements
const getPediatreMeasurements = async (req, res, next) => {
  try {
    if (!await checkAccess(req.params.childId, req.user, res)) return
    const measurements = await Measurement.find({ childId: req.params.childId }).sort({ date: 1 })
    res.json({ success: true, data: measurements })
  } catch (err) { next(err) }
}

// POST /api/pediatre/patients/:childId/measurements
const createPediatreMeasurement = async (req, res, next) => {
  try {
    if (!await checkAccess(req.params.childId, req.user, res)) return

    const { date, weight, height, headCircumference } = req.body
    if (!date) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'La date est requise' }
      })
    }
    if (!weight && !height && !headCircumference) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Au moins une mesure est requise (poids, taille ou périmètre crânien)' }
      })
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

// PUT /api/pediatre/patients/:childId/measurements/:id
const updatePediatreMeasurement = async (req, res, next) => {
  try {
    if (!await checkAccess(req.params.childId, req.user, res)) return

    const { date, weight, height, headCircumference } = req.body
    const measurement = await Measurement.findOneAndUpdate(
      { _id: req.params.id, childId: req.params.childId },
      {
        $set: {
          date,
          weight: weight || undefined,
          height: height || undefined,
          headCircumference: headCircumference || undefined
        }
      },
      { new: true, runValidators: true }
    )
    if (!measurement) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Mesure introuvable' }
      })
    }
    res.json({ success: true, data: measurement })
  } catch (err) { next(err) }
}

// DELETE /api/pediatre/patients/:childId/measurements/:id
const deletePediatreMeasurement = async (req, res, next) => {
  try {
    if (!await checkAccess(req.params.childId, req.user, res)) return

    const measurement = await Measurement.findOneAndDelete({
      _id: req.params.id,
      childId: req.params.childId
    })
    if (!measurement) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Mesure introuvable' }
      })
    }
    res.json({ success: true, message: 'Mesure supprimée' })
  } catch (err) { next(err) }
}

module.exports = {
  getPediatreMeasurements,
  createPediatreMeasurement,
  updatePediatreMeasurement,
  deletePediatreMeasurement
}
