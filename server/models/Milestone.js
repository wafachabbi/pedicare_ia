const mongoose = require('mongoose')

const milestoneSchema = new mongoose.Schema({
  childId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Child',
    required: true,
    index: true
  },
  category: {
    type: String,
    enum: ['Motricité globale', 'Motricité fine', 'Langage', 'Social/Émotionnel', 'Cognitif'],
    required: [true, 'Catégorie requise']
  },
  title: {
    type: String,
    required: [true, 'Titre requis'],
    trim: true,
    maxlength: [100, 'Titre trop long']
  },
  expectedAgeMonths: {
    type: Number,
    min: [0, 'Âge invalide'],
    max: [216, 'Âge invalide']
  },
  status: {
    type: String,
    enum: ['atteint', 'en_cours', 'non_atteint'],
    default: 'en_cours'
  },
  achievedAt: {
    type: Date
  },
  notes: {
    type: String,
    maxlength: [500, 'Notes trop longues']
  }
}, { timestamps: true })

module.exports = mongoose.model('Milestone', milestoneSchema)
