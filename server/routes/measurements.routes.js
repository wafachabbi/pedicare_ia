const express = require('express')
const router = express.Router({ mergeParams: true })
const auth = require('../middleware/auth')
const checkRole = require('../middleware/checkRole')
const { getMeasurements, createMeasurement, updateMeasurement, deleteMeasurement } = require('../controllers/measurements.controller')

router.use(auth, checkRole('parent'))

router.get('/', getMeasurements)
router.post('/', createMeasurement)
router.put('/:id', updateMeasurement)
router.delete('/:id', deleteMeasurement)

module.exports = router
