const User = require('../models/User')
const Appointment = require('../models/Appointment')
const Vaccination = require('../models/Vaccination')
const Child = require('../models/Child')
const Measurement = require('../models/Measurement')
const { getPatientIds } = require('../services/childAccess')

// GET /api/pediatre/list — liste des pédiatres (accessible aux parents)
const listPediatres = async (req, res, next) => {
  try {
    const pediatres = await User.find({ role: 'pediatre' })
      .select('fullName speciality email _id')
      .lean()
    res.json({ success: true, data: pediatres })
  } catch (err) { next(err) }
}

// GET /api/pediatre/profile
const getProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select('-password')
    if (!user) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Profil introuvable' } })
    }
    res.json({ success: true, data: user })
  } catch (err) { next(err) }
}

// PUT /api/pediatre/profile
const updateProfile = async (req, res, next) => {
  try {
    const { fullName, speciality, phone } = req.body
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $set: { fullName, speciality, phone } },
      { new: true, runValidators: true }
    ).select('-password')
    res.json({ success: true, data: user })
  } catch (err) { next(err) }
}

// GET /api/pediatre/appointments — rendez-vous assignés à ce pédiatre
const getMyAppointments = async (req, res, next) => {
  try {
    const appointments = await Appointment.find({ pediatreId: req.user.id })
      .populate({ path: 'childId', select: 'firstName dateOfBirth gender bloodType' })
      .sort({ dateTime: 1 })
      .lean()
    res.json({ success: true, data: appointments })
  } catch (err) { next(err) }
}

// GET /api/pediatre/vaccinations — vaccinations assignées à ce pédiatre
const getMyVaccinations = async (req, res, next) => {
  try {
    const vaccinations = await Vaccination.find({ pediatreId: req.user.id })
      .populate({ path: 'childId', select: 'firstName dateOfBirth gender' })
      .sort({ administeredAt: -1 })
      .lean()
    res.json({ success: true, data: vaccinations })
  } catch (err) { next(err) }
}

// GET /api/pediatre/patients — enfants suivis (rendez-vous ou vaccination assignés)
const getPatients = async (req, res, next) => {
  try {
    const childIds = await getPatientIds(req.user.id)
    const children = await Child.find({ _id: { $in: childIds } })
      .select('firstName dateOfBirth gender bloodType')
      .sort({ firstName: 1 })
      .lean()
    res.json({ success: true, data: children })
  } catch (err) { next(err) }
}

// GET /api/pediatre/fiches — enfants des rendez-vous assignés (fiches partagées)
const getFiches = async (req, res, next) => {
  try {
    const appointments = await Appointment.find({ pediatreId: req.user.id })
      .populate({ path: 'childId', select: 'firstName dateOfBirth gender bloodType allergies antecedentsMedicaux' })
      .lean()

    // Dédupliquer par enfant
    const childMap = new Map()
    for (const appt of appointments) {
      if (appt.childId && !childMap.has(String(appt.childId._id))) {
        childMap.set(String(appt.childId._id), appt.childId)
      }
    }
    res.json({ success: true, data: Array.from(childMap.values()) })
  } catch (err) { next(err) }
}

// GET /api/pediatre/croissance — mesures de croissance des enfants assignés
const getCroissance = async (req, res, next) => {
  try {
    const appointments = await Appointment.find({ pediatreId: req.user.id })
      .select('childId').lean()

    const childIds = [...new Set(appointments.map(a => String(a.childId)).filter(Boolean))]

    const [children, measurements] = await Promise.all([
      Child.find({ _id: { $in: childIds } }).select('firstName dateOfBirth gender').lean(),
      Measurement.find({ childId: { $in: childIds } }).sort({ date: 1 }).lean()
    ])

    res.json({ success: true, data: { children, measurements } })
  } catch (err) { next(err) }
}

module.exports = { listPediatres, getProfile, updateProfile, getMyAppointments, getMyVaccinations, getPatients, getFiches, getCroissance }
