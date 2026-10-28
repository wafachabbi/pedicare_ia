const express = require('express')
const router = express.Router()
const auth = require('../middleware/auth')
const checkRole = require('../middleware/checkRole')
const { listPediatres, getProfile, updateProfile, getMyAppointments, getMyVaccinations, getPatients, getFiches, getCroissance } = require('../controllers/pediatre.controller')
const { getPediatreMeasurements, createPediatreMeasurement, updatePediatreMeasurement, deletePediatreMeasurement } = require('../controllers/pediatreMeasurements.controller')

// Route accessible à tout utilisateur authentifié — liste des pédiatres
router.get('/list', auth, listPediatres)

// Routes réservées aux pédiatres
router.use(auth, checkRole('pediatre'))
router.get('/profile', getProfile)
router.put('/profile', updateProfile)
router.get('/appointments', getMyAppointments)
router.get('/vaccinations', getMyVaccinations)
router.get('/patients', getPatients)
router.get('/croissance', getCroissance)

// Mesures de croissance par patient — CRUD pédiatre
router.get('/patients/:childId/measurements', getPediatreMeasurements)
router.post('/patients/:childId/measurements', createPediatreMeasurement)
router.put('/patients/:childId/measurements/:id', updatePediatreMeasurement)
router.delete('/patients/:childId/measurements/:id', deletePediatreMeasurement)

module.exports = router
