const express = require('express')
const router = express.Router({ mergeParams: true }) // pour accéder à :childId
const auth = require('../middleware/auth')
const checkRole = require('../middleware/checkRole')
const { getVaccinations, createVaccination, updateVaccination, deleteVaccination } = require('../controllers/vaccinations.controller')

router.use(auth, checkRole('parent'))

router.get('/', getVaccinations)
router.post('/', createVaccination)
router.put('/:id', updateVaccination)
router.delete('/:id', deleteVaccination)

module.exports = router
