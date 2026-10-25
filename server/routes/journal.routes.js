const express = require('express')
const router = express.Router({ mergeParams: true }) // pour accéder à :childId
const auth = require('../middleware/auth')
const checkRole = require('../middleware/checkRole')
const { getJournalEntries, createJournalEntry, updateJournalEntry, deleteJournalEntry } = require('../controllers/journal.controller')

// Lecture : parent et pédiatre (enfants qu'il suit) — écriture : parent uniquement
router.use(auth, checkRole('parent', 'pediatre'))

router.get('/', getJournalEntries)
router.post('/', checkRole('parent'), createJournalEntry)
router.put('/:id', checkRole('parent'), updateJournalEntry)
router.delete('/:id', checkRole('parent'), deleteJournalEntry)

module.exports = router
