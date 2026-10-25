const express = require('express')
const router = express.Router()
const auth = require('../middleware/auth')
const checkRole = require('../middleware/checkRole')
const { generateSheet, getChildSheets, getMySharedSheets, getSheet, deleteSheet } = require('../controllers/consultationSheet.controller')

router.use(auth)

router.post('/children/:childId', checkRole('parent'), generateSheet)
router.get('/children/:childId', checkRole('parent'), getChildSheets)
router.get('/shared', checkRole('pediatre'), getMySharedSheets) // avant /:id
router.get('/:id', checkRole('parent', 'pediatre'), getSheet)
router.delete('/:id', checkRole('parent'), deleteSheet)

module.exports = router
