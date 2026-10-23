const mongoose = require('mongoose')

const documentSchema = new mongoose.Schema({
  childId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Child',
    required: true,
    index: true
  },
  originalName: {
    type: String,
    required: [true, 'Nom du fichier requis'],
    maxlength: 255
  },
  filename: {
    type: String,
    required: true
  },
  mimetype: {
    type: String,
    required: true
  },
  size: {
    type: Number,
    required: true
  },
  category: {
    type: String,
    enum: ['ordonnance', 'résultat', 'compte-rendu', 'autre'],
    default: 'autre'
  },
  date: {
    type: Date,
    default: Date.now
  },
  notes: {
    type: String,
    maxlength: 500,
    default: ''
  }
}, { timestamps: true })

module.exports = mongoose.model('Document', documentSchema)
