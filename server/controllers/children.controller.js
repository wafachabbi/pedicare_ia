const Child = require('../models/Child')
const Measurement = require('../models/Measurement')
const Vaccination = require('../models/Vaccination')
const Appointment = require('../models/Appointment')
const JournalEntry = require('../models/JournalEntry')

// GET /api/children — liste des enfants du parent connecté
const getChildren = async (req, res, next) => {
  try {
    const children = await Child.find({ parentId: req.user.id }).sort({ createdAt: -1 })
    res.json({ success: true, data: children })
  } catch (err) {
    next(err)
  }
}

// POST /api/children — créer un profil enfant
const createChild = async (req, res, next) => {
  try {
    const { firstName, dateOfBirth, gender, bloodType, allergies } = req.body

    if (!firstName || !dateOfBirth || !gender) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Prénom, date de naissance et genre sont requis' }
      })
    }

    const child = await Child.create({
      parentId: req.user.id,
      firstName,
      dateOfBirth,
      gender,
      bloodType,
      allergies
    })

    res.status(201).json({ success: true, data: child })
  } catch (err) {
    next(err)
  }
}

// GET /api/children/:id — détail d'un enfant
const getChild = async (req, res, next) => {
  try {
    const child = await Child.findOne({ _id: req.params.id, parentId: req.user.id })
    if (!child) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Profil enfant introuvable' }
      })
    }
    res.json({ success: true, data: child })
  } catch (err) {
    next(err)
  }
}

// PUT /api/children/:id — modifier un profil enfant
const updateChild = async (req, res, next) => {
  try {
    const child = await Child.findOneAndUpdate(
      { _id: req.params.id, parentId: req.user.id },
      { $set: req.body },
      { new: true, runValidators: true }
    )
    if (!child) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Profil enfant introuvable' }
      })
    }
    res.json({ success: true, data: child })
  } catch (err) {
    next(err)
  }
}

// DELETE /api/children/:id — supprimer un profil enfant + cascade
const deleteChild = async (req, res, next) => {
  try {
    const child = await Child.findOneAndDelete({ _id: req.params.id, parentId: req.user.id })
    if (!child) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Profil enfant introuvable' }
      })
    }
    // Suppression en cascade
    await Promise.all([
      Measurement.deleteMany({ childId: req.params.id }),
      Vaccination.deleteMany({ childId: req.params.id }),
      Appointment.deleteMany({ childId: req.params.id }),
      JournalEntry.deleteMany({ childId: req.params.id })
    ])
    res.json({ success: true, message: 'Profil enfant supprimé' })
  } catch (err) {
    next(err)
  }
}

module.exports = { getChildren, createChild, getChild, updateChild, deleteChild }
