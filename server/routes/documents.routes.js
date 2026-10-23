const express = require('express')
const router = express.Router({ mergeParams: true })
const auth = require('../middleware/auth')
const checkRole = require('../middleware/checkRole')
const upload = require('../middleware/upload')
const { getDocuments, uploadDocument, deleteDocument, serveDocument } = require('../controllers/documents.controller')

router.use(auth, checkRole('parent'))

router.get('/', getDocuments)
router.post('/', upload.single('file'), uploadDocument)
router.delete('/:id', deleteDocument)
router.get('/:id/file', serveDocument)

module.exports = router
