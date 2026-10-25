const express = require('express')
const router = express.Router({ mergeParams: true }) // pour accéder à :childId
const auth = require('../middleware/auth')
const checkRole = require('../middleware/checkRole')
const { getMedicalContacts, createMedicalContact, updateMedicalContact, deleteMedicalContact } = require('../controllers/medicalContacts.controller')

// Lecture : parent et pédiatre (enfants qu'il suit) — écriture : parent uniquement
router.use(auth, checkRole('parent', 'pediatre'))

router.get('/', getMedicalContacts)
router.post('/', checkRole('parent'), createMedicalContact)
router.put('/:id', checkRole('parent'), updateMedicalContact)
router.delete('/:id', checkRole('parent'), deleteMedicalContact)

module.exports = router
