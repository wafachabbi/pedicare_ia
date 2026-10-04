const mongoose = require('mongoose')

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, 'Email requis'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Format email invalide']
  },
  password: {
    type: String,
    required: [true, 'Mot de passe requis'],
    minlength: [6, 'Le mot de passe doit contenir au moins 6 caractères']
  },
  role: {
    type: String,
    enum: ['parent', 'pediatre'],
    default: 'parent'
  },
  // Champs spécifiques au pédiatre
  fullName: {
    type: String,
    trim: true,
    maxlength: [100, 'Nom trop long']
  },
  speciality: {
    type: String,
    trim: true,
    maxlength: [100, 'Spécialité trop longue']
  },
  phone: {
    type: String,
    trim: true,
    maxlength: [20, 'Téléphone trop long']
  }
}, { timestamps: true })

module.exports = mongoose.model('User', userSchema)
