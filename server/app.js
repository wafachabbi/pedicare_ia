const express = require('express')
const cors = require('cors')
const errorHandler = require('./middleware/errorHandler')

const app = express()

// Middleware
app.use(cors({ origin: 'http://localhost:5173', credentials: true }))
app.use(express.json())

// Routes (seront ajoutées au fur et à mesure)
app.use('/api/auth', require('./routes/auth.routes'))

// Health check
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'PediCare AI API is running' })
})

// Error handler (doit être en dernier)
app.use(errorHandler)

module.exports = app
