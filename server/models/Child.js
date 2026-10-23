const mongoose = require('mongoose')

const childSchema = new mongoose.Schema({
  parentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  firstName: {
    type: String,
    required: [true, 'Prénom requis'],
    trim: true,
    maxlength: [50, 'Prénom trop long']
  },
  dateOfBirth: {
    type: Date,
    required: [true, 'Date de naissance requise']
  },
  gender: {
    type: String,
    enum: ['M', 'F', 'other'],
    required: [true, 'Genre requis']
  },
  vaccineRemindersEnabled: {
    type: Boolean,
    default: false
  },
  bloodType: {
    type: String,
    enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Inconnu'],
    default: 'Inconnu'
  },
  allergies: {
    type: String,
    maxlength: [500, 'Allergies trop longues'],
    default: ''
  }
}, { timestamps: true })

module.exports = mongoose.model('Child', childSchema)
