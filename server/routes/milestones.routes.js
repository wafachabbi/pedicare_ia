const express = require('express')
const router = express.Router({ mergeParams: true }) // pour accéder à :childId
const auth = require('../middleware/auth')
const checkRole = require('../middleware/checkRole')
const { getMilestones, createMilestone, updateMilestone, deleteMilestone } = require('../controllers/milestones.controller')

// Parent (ses enfants) et pédiatre (enfants qu'il suit) : lecture + écriture
router.use(auth, checkRole('parent', 'pediatre'))

router.get('/', getMilestones)
router.post('/', createMilestone)
router.put('/:id', updateMilestone)
router.delete('/:id', deleteMilestone)

module.exports = router
