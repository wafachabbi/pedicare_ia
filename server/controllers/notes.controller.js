const PediatreNote = require('../models/PediatreNote')
const Appointment = require('../models/Appointment')

// Un enfant est patient du pédiatre s'il a au moins un RDV avec lui
const isMyPatient = async (childId, pediatreId) => {
  const appointment = await Appointment.exists({ childId, pediatreId })
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

// GET /api/notes/patients — enfants ayant au moins un RDV avec ce pédiatre
const getMyPatients = async (req, res, next) => {
  try {
    const appointments = await Appointment.find({ pediatreId: req.user.id })
      .populate({ path: 'childId', select: 'firstName dateOfBirth gender' })
      .lean()
    // Dédoublonnage par enfant (ignore les enfants supprimés)
    const patients = new Map()
    appointments.forEach(a => {
      if (a.childId) patients.set(a.childId._id.toString(), a.childId)
    })
    res.json({ success: true, data: [...patients.values()] })
  } catch (err) { handleError(err, res, next) }
}

// GET /api/notes?childId= — notes du pédiatre connecté
const getNotes = async (req, res, next) => {
  try {
    const filter = { pediatreId: req.user.id }
    if (req.query.childId) filter.childId = req.query.childId
    const notes = await PediatreNote.find(filter)
      .populate({ path: 'childId', select: 'firstName' })
      .sort({ createdAt: -1 })
      .lean()
    res.json({ success: true, data: notes })
  } catch (err) { handleError(err, res, next) }
}

// GET /api/notes/:id
const getNote = async (req, res, next) => {
  try {
    const note = await PediatreNote.findOne({ _id: req.params.id, pediatreId: req.user.id })
      .populate({ path: 'childId', select: 'firstName' })
      .lean()
    if (!note) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Note introuvable' } })
    }
    res.json({ success: true, data: note })
  } catch (err) { handleError(err, res, next) }
}

// POST /api/notes
const createNote = async (req, res, next) => {
  try {
    const { childId, title, content, category, isPrivate } = req.body
    if (!title || !content) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Titre et contenu requis' } })
    }
    if (!childId || !await isMyPatient(childId, req.user.id)) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: "Cet enfant n'est pas votre patient" } })
    }
    // pediatreId toujours issu du token, jamais du body
    const note = await PediatreNote.create({ pediatreId: req.user.id, childId, title, content, category, isPrivate })
    res.status(201).json({ success: true, data: note })
  } catch (err) { handleError(err, res, next) }
}

// PUT /api/notes/:id
const updateNote = async (req, res, next) => {
  try {
    // Seuls ces champs sont modifiables
    const updates = {}
    ;['title', 'content', 'category', 'isPrivate'].forEach(field => {
      if (req.body[field] !== undefined) updates[field] = req.body[field]
    })
    const note = await PediatreNote.findOneAndUpdate(
      { _id: req.params.id, pediatreId: req.user.id },
      { $set: updates },
      { new: true, runValidators: true }
    )
    if (!note) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Note introuvable' } })
    }
    res.json({ success: true, data: note })
  } catch (err) { handleError(err, res, next) }
}

// DELETE /api/notes/:id
const deleteNote = async (req, res, next) => {
  try {
    const note = await PediatreNote.findOneAndDelete({ _id: req.params.id, pediatreId: req.user.id })
    if (!note) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Note introuvable' } })
    }
    res.json({ success: true, message: 'Note supprimée' })
  } catch (err) { handleError(err, res, next) }
}

module.exports = { getMyPatients, getNotes, getNote, createNote, updateNote, deleteNote }
