const mongoose = require('mongoose')

const consultationQuestionSchema = new mongoose.Schema({
  parentId: {
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
  appointmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Appointment',
    default: null
  },
  question: {
    type: String,
    required: [true, 'Question requise'],
    trim: true,
    maxlength: [500, 'Question trop longue']
  },
  category: {
    type: String,
    enum: ['symptome', 'alimentation', 'sommeil', 'developpement', 'traitement', 'autre'],
    default: 'autre'
  },
  priority: {
    type: String,
    enum: ['basse', 'normale', 'haute'],
    default: 'normale'
  },
  status: {
    type: String,
    enum: ['en_attente', 'traitee'],
    default: 'en_attente'
  }
}, { timestamps: true })

module.exports = mongoose.model('ConsultationQuestion', consultationQuestionSchema)
