const express = require('express')
const router = express.Router({ mergeParams: true }) // pour accéder à :childId
const auth = require('../middleware/auth')
const checkRole = require('../middleware/checkRole')
const { getMedicalRecords, createMedicalRecord, updateMedicalRecord, deleteMedicalRecord } = require('../controllers/medicalRecords.controller')

// Parent (ses enfants) et pédiatre (enfants qu'il suit) : lecture + écriture
router.use(auth, checkRole('parent', 'pediatre'))

router.get('/', getMedicalRecords)
router.post('/', createMedicalRecord)
router.put('/:id', updateMedicalRecord)
router.delete('/:id', deleteMedicalRecord)

module.exports = router
