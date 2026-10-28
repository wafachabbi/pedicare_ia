const mongoose = require('mongoose')

const medicalContactSchema = new mongoose.Schema({
  childId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Child',
    required: true,
    index: true
  },
  type: {
    type: String,
    enum: ['pediatre', 'specialiste', 'autre'],
    required: [true, 'Type de contact requis']
  },
  name: {
    type: String,
    required: [true, 'Nom du contact requis'],
    trim: true,
    maxlength: [100, 'Nom trop long']
  },
  specialty: {
    type: String,
    trim: true
  },
  phone: {
    type: String,
    trim: true,
    maxlength: [20, 'Téléphone trop long']
  },
  email: {
    type: String,
    match: [/^\S+@\S+\.\S+$/, 'Format email invalide'],
    lowercase: true,
    trim: true
  },
  adresse: {
    type: String,
    trim: true
  },
  notes: {
    type: String,
    maxlength: [500, 'Notes trop longues']
  }
}, { timestamps: true })

module.exports = mongoose.model('MedicalContact', medicalContactSchema)