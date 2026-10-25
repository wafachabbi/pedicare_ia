const express = require('express')
const router = express.Router()
const auth = require('../middleware/auth')
const checkRole = require('../middleware/checkRole')
const { getMyPatients, getNotes, getNote, createNote, updateNote, deleteNote } = require('../controllers/notes.controller')

// Routes réservées aux pédiatres
router.use(auth, checkRole('pediatre'))

// /patients doit être déclarée avant /:id
router.get('/patients', getMyPatients)
router.get('/', getNotes)
router.get('/:id', getNote)
router.post('/', createNote)
router.put('/:id', updateNote)
router.delete('/:id', deleteNote)

module.exports = router
