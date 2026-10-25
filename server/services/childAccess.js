const mongoose = require('mongoose')
const Child = require('../models/Child')
const Appointment = require('../models/Appointment')
const Vaccination = require('../models/Vaccination')

// Un pédiatre "suit" un enfant s'il lui est assigné sur un rendez-vous ou une vaccination
const getPatientIds = async (pediatreId) => {
  const [fromAppointments, fromVaccinations] = await Promise.all([
    Appointment.distinct('childId', { pediatreId }),
    Vaccination.distinct('childId', { pediatreId })
  ])
  return [...new Set([...fromAppointments, ...fromVaccinations].map(String))]
}

// Vérifie l'accès d'un utilisateur à un enfant
// - parent : uniquement ses propres enfants
// - pédiatre : uniquement les enfants qu'il suit
const canAccessChild = async (childId, user) => {
  if (!mongoose.isValidObjectId(childId)) return false
  if (user.role === 'parent') {
    return !!await Child.exists({ _id: childId, parentId: user.id })
  }
  if (user.role === 'pediatre') {
    const [appt, vacc] = await Promise.all([
      Appointment.exists({ childId, pediatreId: user.id }),
      Vaccination.exists({ childId, pediatreId: user.id })
    ])
    return !!(appt || vacc)
  }
  return false
}

module.exports = { canAccessChild, getPatientIds }
