const mongoose = require('mongoose')

const adSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Titre requis'],
    maxlength: 100
  },
  description: {
    type: String,
    maxlength: 300,
    default: ''
  },
  badge: {
    type: String,
    maxlength: 30,
    default: ''
  },
  badgeColor: {
    type: String,
    enum: ['blue', 'rose', 'emerald', 'orange', 'violet'],
    default: 'blue'
  },
  link: {
    type: String,
    maxlength: 500,
    default: '#'
  },
  filename: {
    type: String,
    required: true
  },
  originalName: {
    type: String,
    required: true
  },
  mimetype: {
    type: String,
    required: true
  },
  active: {
    type: Boolean,
    default: true
  },
  order: {
    type: Number,
    default: 0
  }
}, { timestamps: true })

module.exports = mongoose.model('Ad', adSchema)
