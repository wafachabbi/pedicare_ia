const Appointment = require('../models/Appointment')
const Child = require('../models/Child')

const ownsChild = async (childId, userId) => {
  const child = await Child.findOne({ _id: childId, parentId: userId })
  return !!child
}

// GET /api/children/:childId/appointments
const getAppointments = async (req, res, next) => {
  try {
    if (!await ownsChild(req.params.childId, req.user.id)) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Enfant introuvable' } })
    }
    const appointments = await Appointment.find({ childId: req.params.childId }).sort({ dateTime: 1 })
    res.json({ success: true, data: appointments })
  } catch (err) { next(err) }
}

// POST /api/children/:childId/appointments
const createAppointment = async (req, res, next) => {
  try {
    if (!await ownsChild(req.params.childId, req.user.id)) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Enfant introuvable' } })
    }
    const { type, dateTime, practitioner, notes } = req.body
    if (!type || !dateTime) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Type et date/heure requis' } })
    }
    // Statut auto selon la date
    const status = new Date(dateTime) >= new Date() ? 'upcoming' : 'past'
    const appointment = await Appointment.create({ childId: req.params.childId, type, dateTime, practitioner, notes, status })
    res.status(201).json({ success: true, data: appointment })
  } catch (err) { next(err) }
}

// PUT /api/children/:childId/appointments/:id
const updateAppointment = async (req, res, next) => {
  try {
    if (!await ownsChild(req.params.childId, req.user.id)) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Enfant introuvable' } })
    }
    // Recalcul du statut si dateTime modifié
    if (req.body.dateTime) {
      req.body.status = new Date(req.body.dateTime) >= new Date() ? 'upcoming' : 'past'
    }
    const appointment = await Appointment.findOneAndUpdate(
      { _id: req.params.id, childId: req.params.childId },
      { $set: req.body },
      { new: true, runValidators: true }
    )
    if (!appointment) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Rendez-vous introuvable' } })
    }
    res.json({ success: true, data: appointment })
  } catch (err) { next(err) }
}

// DELETE /api/children/:childId/appointments/:id
const deleteAppointment = async (req, res, next) => {
  try {
    if (!await ownsChild(req.params.childId, req.user.id)) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Enfant introuvable' } })
    }
    const appointment = await Appointment.findOneAndDelete({ _id: req.params.id, childId: req.params.childId })
    if (!appointment) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Rendez-vous introuvable' } })
    }
    res.json({ success: true, message: 'Rendez-vous supprimé' })
  } catch (err) { next(err) }
}

module.exports = { getAppointments, createAppointment, updateAppointment, deleteAppointment }
