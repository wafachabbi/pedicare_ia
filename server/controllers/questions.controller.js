const mongoose = require('mongoose')
const ConsultationQuestion = require('../models/ConsultationQuestion')
const Appointment = require('../models/Appointment')
const Child = require('../models/Child')

const PRIORITY_RANK = { haute: 0, normale: 1, basse: 2 }

const ownsChild = async (childId, userId) => {
  const child = await Child.findOne({ _id: childId, parentId: userId })
  return !!child
}

// Le RDV doit exister et appartenir à cet enfant
const appointmentBelongsToChild = async (appointmentId, childId) => {
  if (!mongoose.isValidObjectId(appointmentId)) return false
  const appointment = await Appointment.exists({ _id: appointmentId, childId })
  return !!appointment
}

// Erreurs Mongoose → réponses 400 / 404, le reste au errorHandler
const handleError = (err, res, next) => {
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map(e => e.message).join(', ')
    return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message } })
  }
  if (err.name === 'CastError') {
    return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Ressource introuvable' } })
  }
  next(err)
}

const childNotFound = res =>
  res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Enfant introuvable' } })

const invalidAppointment = res =>
  res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Rendez-vous invalide pour cet enfant' } })

// GET /api/children/:childId/questions?status=&appointmentId=
const getQuestions = async (req, res, next) => {
  try {
    if (!await ownsChild(req.params.childId, req.user.id)) return childNotFound(res)
    const filter = { childId: req.params.childId }
    if (req.query.status) filter.status = req.query.status
    if (req.query.appointmentId) filter.appointmentId = req.query.appointmentId
    const questions = await ConsultationQuestion.find(filter).sort({ createdAt: -1 }).lean()
    // Tri stable par priorité (haute > normale > basse), createdAt desc conservé
    questions.sort((a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority])
    res.json({ success: true, data: questions })
  } catch (err) { handleError(err, res, next) }
}

// POST /api/children/:childId/questions
const createQuestion = async (req, res, next) => {
  try {
    if (!await ownsChild(req.params.childId, req.user.id)) return childNotFound(res)
    const { question, category, priority, appointmentId } = req.body
    if (appointmentId && !await appointmentBelongsToChild(appointmentId, req.params.childId)) {
      return invalidAppointment(res)
    }
    // parentId toujours issu du token, jamais du body
    const created = await ConsultationQuestion.create({
      parentId: req.user.id,
      childId: req.params.childId,
      appointmentId: appointmentId || null,
      question,
      category,
      priority
    })
    res.status(201).json({ success: true, data: created })
  } catch (err) { handleError(err, res, next) }
}

// PUT /api/children/:childId/questions/:id
const updateQuestion = async (req, res, next) => {
  try {
    if (!await ownsChild(req.params.childId, req.user.id)) return childNotFound(res)
    // Seuls ces champs sont modifiables
    const updates = {}
    ;['question', 'category', 'priority', 'status', 'appointmentId'].forEach(field => {
      if (req.body[field] !== undefined) updates[field] = req.body[field]
    })
    // appointmentId vide → détache la question du RDV
    if (updates.appointmentId !== undefined) {
      if (!updates.appointmentId) {
        updates.appointmentId = null
      } else if (!await appointmentBelongsToChild(updates.appointmentId, req.params.childId)) {
        return invalidAppointment(res)
      }
    }
    const question = await ConsultationQuestion.findOneAndUpdate(
      { _id: req.params.id, childId: req.params.childId, parentId: req.user.id },
      { $set: updates },
      { new: true, runValidators: true }
    )
    if (!question) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Question introuvable' } })
    }
    res.json({ success: true, data: question })
  } catch (err) { handleError(err, res, next) }
}

// DELETE /api/children/:childId/questions/:id
const deleteQuestion = async (req, res, next) => {
  try {
    if (!await ownsChild(req.params.childId, req.user.id)) return childNotFound(res)
    const question = await ConsultationQuestion.findOneAndDelete({ _id: req.params.id, childId: req.params.childId, parentId: req.user.id })
    if (!question) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Question introuvable' } })
    }
    res.json({ success: true, message: 'Question supprimée' })
  } catch (err) { handleError(err, res, next) }
}

module.exports = { getQuestions, createQuestion, updateQuestion, deleteQuestion }
