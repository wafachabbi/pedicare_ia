const Milestone = require('../models/Milestone')
const { canAccessChild } = require('../services/childAccess')

const FIELDS = ['category', 'title', 'expectedAgeMonths', 'status', 'achievedAt', 'notes']

// Ne garde que les champs modifiables (empêche de changer childId)
const pick = (body) => Object.fromEntries(FIELDS.filter(k => body[k] !== undefined).map(k => [k, body[k]]))

const notFound = (res, message = 'Enfant introuvable') =>
  res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message } })

// GET /api/children/:childId/milestones
const getMilestones = async (req, res, next) => {
  try {
    if (!await canAccessChild(req.params.childId, req.user)) return notFound(res)
    const milestones = await Milestone.find({ childId: req.params.childId }).sort({ expectedAgeMonths: 1, createdAt: 1 })
    res.json({ success: true, data: milestones })
  } catch (err) { next(err) }
}

// POST /api/children/:childId/milestones
const createMilestone = async (req, res, next) => {
  try {
    if (!await canAccessChild(req.params.childId, req.user)) return notFound(res)
    const data = pick(req.body)
    if (!data.category || !data.title) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Catégorie et titre requis' } })
    }
    if (data.status === 'atteint' && !data.achievedAt) data.achievedAt = new Date()
    if (data.status !== 'atteint') data.achievedAt = null
    const milestone = await Milestone.create({ ...data, childId: req.params.childId })
    res.status(201).json({ success: true, data: milestone })
  } catch (err) { next(err) }
}

// PUT /api/children/:childId/milestones/:id
const updateMilestone = async (req, res, next) => {
  try {
    if (!await canAccessChild(req.params.childId, req.user)) return notFound(res)
    const data = pick(req.body)
    if (data.status === 'atteint' && !data.achievedAt) data.achievedAt = new Date()
    if (data.status && data.status !== 'atteint') data.achievedAt = null
    const milestone = await Milestone.findOneAndUpdate(
      { _id: req.params.id, childId: req.params.childId },
      { $set: data },
      { new: true, runValidators: true }
    )
    if (!milestone) return notFound(res, 'Étape introuvable')
    res.json({ success: true, data: milestone })
  } catch (err) { next(err) }
}

// DELETE /api/children/:childId/milestones/:id
const deleteMilestone = async (req, res, next) => {
  try {
    if (!await canAccessChild(req.params.childId, req.user)) return notFound(res)
    const milestone = await Milestone.findOneAndDelete({ _id: req.params.id, childId: req.params.childId })
    if (!milestone) return notFound(res, 'Étape introuvable')
    res.json({ success: true, message: 'Étape supprimée' })
  } catch (err) { next(err) }
}

module.exports = { getMilestones, createMilestone, updateMilestone, deleteMilestone }
