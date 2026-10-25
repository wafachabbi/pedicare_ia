const express = require('express')
const cors = require('cors')
const errorHandler = require('./middleware/errorHandler')

const app = express()

// Middleware
app.use(cors({ origin: 'http://localhost:5173', credentials: true }))
app.use(express.json())

// Fichiers uploadés (documents médicaux)
app.use('/uploads', require('./middleware/auth'), express.static(require('path').join(__dirname, 'uploads')))

// Routes (seront ajoutées au fur et à mesure)
app.use('/api/auth', require('./routes/auth.routes'))
app.use('/api/children', require('./routes/children.routes'))
app.use('/api/children/:childId/vaccinations', require('./routes/vaccinations.routes'))
app.use('/api/children/:childId/appointments', require('./routes/appointments.routes'))
app.use('/api/children/:childId/questions', require('./routes/questions.routes'))
app.use('/api/children/:childId/measurements', require('./routes/measurements.routes'))
app.use('/api/children/:childId/documents', require('./routes/documents.routes'))
app.use('/api/pediatre', require('./routes/pediatre.routes'))
app.use('/api/notes', require('./routes/notes.routes'))
app.use('/api/ai', require('./routes/ai.routes'))
app.use('/api/consultation-sheets', require('./routes/consultationSheet.routes'))
app.use('/api/ads', require('./routes/ads.routes'))

// Health check
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'PediCare AI API is running' })
})

// Error handler (doit être en dernier)
app.use(errorHandler)

module.exports = app
