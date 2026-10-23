const express = require('express')
const router = express.Router()
const auth = require('../middleware/auth')
const upload = require('../middleware/upload')
const { getAds, getAllAds, createAd, updateAd, updateAdFull, deleteAd, serveAdImage } = require('../controllers/ads.controller')

// Public
router.get('/', getAds)

// Admin — ces routes AVANT /:id pour éviter le conflit
router.get('/all', auth, getAllAds)
router.post('/', auth, upload.single('image'), createAd)

// Routes avec :id (en dernier)
router.get('/:id/image', serveAdImage)
router.patch('/:id', auth, updateAd)
router.put('/:id', auth, upload.single('image'), updateAdFull)
router.delete('/:id', auth, deleteAd)

module.exports = router
