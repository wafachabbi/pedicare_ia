const express = require('express')
const router = express.Router()
const auth = require('../middleware/auth')
const checkRole = require('../middleware/checkRole')
const { getChildren, createChild, getChild, updateChild, deleteChild } = require('../controllers/children.controller')

// Toutes les routes nécessitent auth + rôle parent
router.use(auth, checkRole('parent'))

router.get('/', getChildren)
router.post('/', createChild)
router.get('/:id', getChild)
router.put('/:id', updateChild)
router.delete('/:id', deleteChild)

module.exports = router
