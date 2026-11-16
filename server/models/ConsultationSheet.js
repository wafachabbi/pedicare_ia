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
    pointsAttention: [String],
    // Titres des documents RAG cités par le LLM (absent si aucun)
    sources: { type: [String], default: undefined }
  },
  meta: {
    model: String,
    latencyMs: Number,
    promptTokens: Number,
    completionTokens: Number,
    fromCache: Boolean,
    inputHash: String,
    // RAG : documents injectés dans le prompt, nb éliminés par le pruning, détail des sources
    ragDocsUsed: Number,
    ragPruned: Number,
    ragSources: [{ _id: false, title: String, score: Number, base: String }]
  },
  status: {
    type: String,
    enum: ['brouillon', 'partagee'],
    default: 'partagee'
  }
}, { timestamps: true })

module.exports = mongoose.model('ConsultationSheet', consultationSheetSchema)
