const express = require('express')
const router = express.Router()
const auth = require('../middleware/auth')
const checkRole = require('../middleware/checkRole')
const { listPediatres, getProfile, updateProfile, getMyAppointments, getMyVaccinations } = require('../controllers/pediatre.controller')

// Route accessible à tout utilisateur authentifié — liste des pédiatres
router.get('/list', auth, listPediatres)

// Routes réservées aux pédiatres
router.use(auth, checkRole('pediatre'))
router.get('/profile', getProfile)
router.put('/profile', updateProfile)
router.get('/appointments', getMyAppointments)
router.get('/vaccinations', getMyVaccinations)

module.exports = router
