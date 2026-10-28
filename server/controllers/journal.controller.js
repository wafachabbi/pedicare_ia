const JournalEntry = require('../models/JournalEntry')
const { canAccessChild } = require('../services/childAccess')

const FIELDS = ['date', 'text', 'category']

// Ne garde que les champs modifiables (empêche de changer childId)
const pick = (body) => Object.fromEntries(FIELDS.filter(k => body[k] !== undefined).map(k => [k, body[k]]))

const notFound = (res, message = 'Enfant introuvable') =>
  res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message } })

// GET /api/children/:childId/journal?category=...
const getJournalEntries = async (req, res, next) => {
  try {
    if (!await canAccessChild(req.params.childId, req.user)) return notFound(res)
    const filter = { childId: req.params.childId }
    if (typeof req.query.category === 'string' && req.query.category) filter.category = req.query.category
    const entries = await JournalEntry.find(filter).sort({ date: -1, createdAt: -1 })
    res.json({ success: true, data: entries })
  } catch (err) { next(err) }
}

// POST /api/children/:childId/journal
const createJournalEntry = async (req, res, next) => {
  try {
    if (!await canAccessChild(req.params.childId, req.user)) return notFound(res)
    const data = pick(req.body)
    if (!data.text || !data.category) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Texte et catégorie requis' } })
    }
    if (!data.date) delete data.date
    const entry = await JournalEntry.create({ ...data, childId: req.params.childId })
    res.status(201).json({ success: true, data: entry })
  } catch (err) { next(err) }
}

// PUT /api/children/:childId/journal/:id
const updateJournalEntry = async (req, res, next) => {
  try {
    if (!await canAccessChild(req.params.childId, req.user)) return notFound(res)
    const data = pick(req.body)
    if (!data.date) delete data.date
    const entry = await JournalEntry.findOneAndUpdate(
      { _id: req.params.id, childId: req.params.childId },
      { $set: data },
      { new: true, runValidators: true }
    )
    if (!entry) return notFound(res, 'Observation introuvable')
    res.json({ success: true, data: entry })
  } catch (err) { next(err) }
}

// DELETE /api/children/:childId/journal/:id
const deleteJournalEntry = async (req, res, next) => {
  try {
    if (!await canAccessChild(req.params.childId, req.user)) return notFound(res)
    const entry = await JournalEntry.findOneAndDelete({ _id: req.params.id, childId: req.params.childId })
    if (!entry) return notFound(res, 'Observation introuvable')
    res.json({ success: true, message: 'Observation supprimée' })
  } catch (err) { next(err) }
}

module.exports = { getJournalEntries, createJournalEntry, updateJournalEntry, deleteJournalEntry }
