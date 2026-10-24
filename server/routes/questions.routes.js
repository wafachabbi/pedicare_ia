const express = require('express')
const router = express.Router({ mergeParams: true }) // pour accéder à :childId
const auth = require('../middleware/auth')
const checkRole = require('../middleware/checkRole')
const { getQuestions, createQuestion, updateQuestion, deleteQuestion } = require('../controllers/questions.controller')

router.use(auth, checkRole('parent'))

router.get('/', getQuestions)
router.post('/', createQuestion)
router.put('/:id', updateQuestion)
router.delete('/:id', deleteQuestion)

module.exports = router
