const mongoose = require('mongoose')

const measurementSchema = new mongoose.Schema({
  childId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Child',
    required: true,
    index: true
  },
  date: {
    type: Date,
    required: [true, 'Date requise']
  },
  weight: {
    type: Number,
    min: [0.5, 'Poids minimum 0.5 kg'],
    max: [200, 'Poids maximum 200 kg']
  },
  height: {
    type: Number,
    min: [20, 'Taille minimum 20 cm'],
    max: [250, 'Taille maximum 250 cm']
  },
  headCircumference: {
    type: Number,
    min: [20, 'Périmètre crânien minimum 20 cm'],
    max: [80, 'Périmètre crânien maximum 80 cm']
  }
}, { timestamps: true })

// Contrainte : au moins un champ de mesure doit être présent
measurementSchema.pre('validate', function (next) {
  if (!this.weight && !this.height && !this.headCircumference) {
    this.invalidate('weight', 'Au moins une mesure (poids, taille ou périmètre crânien) est requise')
  }
  next()
})

module.exports = mongoose.model('Measurement', measurementSchema)
