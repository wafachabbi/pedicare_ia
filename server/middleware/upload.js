const multer = require('multer')
const path = require('path')
const crypto = require('crypto')

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../uploads'))
  },
  filename: (req, file, cb) => {
    // Nom unique : timestamp + hash aléatoire + extension originale
    const ext = path.extname(file.originalname).toLowerCase()
    const unique = Date.now() + '-' + crypto.randomBytes(8).toString('hex')
    cb(null, unique + ext)
  }
})

const fileFilter = (req, file, cb) => {
  const allowed = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
  if (allowed.includes(file.mimetype)) {
    cb(null, true)
  } else {
    cb(new Error('Type de fichier non autorisé. Formats acceptés : PDF, JPEG, PNG, WEBP'), false)
  }
}

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10 MB max
  }
})

module.exports = upload
