const User = require('../models/User')
const Appointment = require('../models/Appointment')
const Vaccination = require('../models/Vaccination')
const Child = require('../models/Child')

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

module.exports = { listPediatres, getProfile, updateProfile, getMyAppointments, getMyVaccinations }
