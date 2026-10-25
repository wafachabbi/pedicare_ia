const mongoose = require('mongoose')

// Allergies et antécédents médicaux d'un enfant
const medicalRecordSchema = new mongoose.Schema({
  childId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Child',
    required: true,
    index: true
  },
  type: {
    type: String,
    enum: ['allergie', 'antecedent'],
    required: [true, 'Type requis']
  },
  name: {
    type: String,
    required: [true, 'Nom requis'],
    trim: true,
    maxlength: [100, 'Nom trop long']
  },
  severity: {
    type: String,
    enum: ['legere', 'moderee', 'severe']
  },
  reaction: {
    type: String,
    trim: true,
    maxlength: [200, 'Réaction trop longue']
  },
  diagnosedAt: {
    type: Date
  },
  treatment: {
    type: String,
    trim: true,
    maxlength: [300, 'Traitement trop long']
  },
  active: {
    type: Boolean,
    default: true
  },
  notes: {
    type: String,
    maxlength: [500, 'Notes trop longues']
  }
}, { timestamps: true })

module.exports = mongoose.model('MedicalRecord', medicalRecordSchema)
