const mongoose = require('mongoose')

const consultationSheetSchema = new mongoose.Schema({
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
  // Pédiatre destinataire de la fiche
  pediatreId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
    index: true
  },
  content: {
    resume: String,
    motifs: [String],
    antecedents: [String],
    questionsParent: [String],
    pointsAttention: [String]
  },
  meta: {
    model: String,
    latencyMs: Number,
    promptTokens: Number,
    completionTokens: Number,
    fromCache: Boolean,
    inputHash: String
  },
  status: {
    type: String,
    enum: ['brouillon', 'partagee'],
    default: 'partagee'
  }
}, { timestamps: true })

module.exports = mongoose.model('ConsultationSheet', consultationSheetSchema)
