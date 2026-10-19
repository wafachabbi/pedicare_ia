const express = require('express')
const router = express.Router()
const auth = require('../middleware/auth')
const { generateSummary, generateReminders, listModels } = require('../controllers/ai.controller')

router.use(auth)
router.post('/summary/:childId', generateSummary)
router.post('/reminders/:childId', generateReminders)
router.get('/models', listModels)

module.exports = router
