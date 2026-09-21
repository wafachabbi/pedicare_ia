const mongoose = require('mongoose')

const vaccinationSchema = new mongoose.Schema({
  childId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Child',
    required: true,
    index: true
  },
  vaccineName: {
    type: String,
    required: [true, 'Nom du vaccin requis'],
    trim: true,
    maxlength: [100, 'Nom trop long']
  },
  administeredAt: {
    type: Date,
    required: [true, 'Date d\'administration requise']
  },
  lotNumber: {
    type: String,
    trim: true,
    maxlength: [50, 'Numéro de lot trop long']
  }
}, { timestamps: true })

module.exports = mongoose.model('Vaccination', vaccinationSchema)
