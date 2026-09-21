const mongoose = require('mongoose')

const appointmentSchema = new mongoose.Schema({
  childId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Child',
    required: true,
    index: true
  },
  type: {
    type: String,
    enum: ['consultation', 'exam'],
    required: [true, 'Type de rendez-vous requis']
  },
  dateTime: {
    type: Date,
    required: [true, 'Date et heure requises']
  },
  practitioner: {
    type: String,
    trim: true,
    maxlength: [100, 'Nom du praticien trop long']
  },
  notes: {
    type: String,
    maxlength: [1000, 'Notes trop longues']
  },
  status: {
    type: String,
    enum: ['upcoming', 'past'],
    default: 'upcoming'
  }
}, { timestamps: true })

module.exports = mongoose.model('Appointment', appointmentSchema)
