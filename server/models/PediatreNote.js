const mongoose = require('mongoose')

const pediatreNoteSchema = new mongoose.Schema({
  pediatreId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  childId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Child',
    required: true,
    index: true
  },
  title: {
    type: String,
    required: [true, 'Titre requis'],
    trim: true,
    maxlength: [100, 'Titre trop long']
  },
  content: {
    type: String,
    required: [true, 'Contenu requis'],
    maxlength: [2000, 'Contenu trop long']
  },
  category: {
    type: String,
    enum: ['observation', 'diagnostic', 'traitement', 'suivi'],
    default: 'observation'
  },
  isPrivate: {
    type: Boolean,
    default: true
  }
}, { timestamps: true })

pediatreNoteSchema.index({ pediatreId: 1, childId: 1, createdAt: -1 })

module.exports = mongoose.model('PediatreNote', pediatreNoteSchema)
