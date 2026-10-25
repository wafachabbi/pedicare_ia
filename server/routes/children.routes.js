const express = require('express')
const router = express.Router()
const auth = require('../middleware/auth')
const checkRole = require('../middleware/checkRole')
const { getChildren, createChild, getChild, updateChild, deleteChild } = require('../controllers/children.controller')

// Toutes les routes nécessitent auth + rôle parent.
// Appliqué route par route (et non via router.use) : ce routeur est monté sur /api/children,
// un router.use bloquerait aussi les sous-routes /api/children/:childId/... ouvertes aux pédiatres.
const parentOnly = [auth, checkRole('parent')]

router.get('/', parentOnly, getChildren)
router.post('/', parentOnly, createChild)
router.get('/:id', parentOnly, getChild)
router.put('/:id', parentOnly, updateChild)
router.delete('/:id', parentOnly, deleteChild)

module.exports = router
