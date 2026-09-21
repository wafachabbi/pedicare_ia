const mongoose = require('mongoose')

const journalEntrySchema = new mongoose.Schema({
  childId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Child',
    required: true,
    index: true
  },
  date: {
    type: Date,
    required: true,
    default: Date.now
  },
  text: {
    type: String,
    required: [true, 'Texte requis'],
    maxlength: [2000, 'Texte limité à 2000 caractères']
  },
  category: {
    type: String,
    enum: ['Observation', 'Question', 'Symptôme', 'Comportement', 'Alimentation', 'Sommeil', 'Autre'],
    required: [true, 'Catégorie requise']
  }
}, { timestamps: true })

module.exports = mongoose.model('JournalEntry', journalEntrySchema)
