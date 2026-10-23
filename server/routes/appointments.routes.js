const express = require('express')
const router = express.Router({ mergeParams: true }) // pour accéder à :childId
const auth = require('../middleware/auth')
const checkRole = require('../middleware/checkRole')
const { getAppointments, createAppointment, updateAppointment, deleteAppointment } = require('../controllers/appointments.controller')

router.use(auth, checkRole('parent'))

router.get('/', getAppointments)
router.post('/', createAppointment)
router.put('/:id', updateAppointment)
router.delete('/:id', deleteAppointment)

module.exports = router
