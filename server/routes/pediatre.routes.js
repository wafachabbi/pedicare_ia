const express = require('express')
const router = express.Router()
const auth = require('../middleware/auth')
const checkRole = require('../middleware/checkRole')
const { getProfile, updateProfile } = require('../controllers/pediatre.controller')

router.use(auth, checkRole('pediatre'))

router.get('/profile', getProfile)
router.put('/profile', updateProfile)

module.exports = router
