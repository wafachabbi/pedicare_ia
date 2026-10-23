const express = require('express')
const router = express.Router()
const auth = require('../middleware/auth')
const { generateSummary, generateReminders, analyzeGrowth, analyzeImage, listModels } = require('../controllers/ai.controller')

router.use(auth)
router.post('/summary/:childId', generateSummary)
router.post('/reminders/:childId', generateReminders)
router.post('/growth/:childId', analyzeGrowth)
router.post('/analyze-image', analyzeImage)
router.get('/models', listModels)

module.exports = router
