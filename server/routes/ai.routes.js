const express = require('express')
const router = express.Router()
const auth = require('../middleware/auth')
const { generateSummary, generateReminders, analyzeGrowth, analyzeImage, analyzeMilestones, summarizeJournal, listModels } = require('../controllers/ai.controller')

router.use(auth)
router.post('/summary/:childId', generateSummary)
router.post('/reminders/:childId', generateReminders)
router.post('/growth/:childId', analyzeGrowth)
router.post('/milestones/:childId', analyzeMilestones)
router.post('/journal/:childId', summarizeJournal)
router.post('/analyze-image', analyzeImage)
router.get('/models', listModels)

module.exports = router
