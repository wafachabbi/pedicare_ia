require('dotenv').config()
const mongoose = require('mongoose')
const app = require('./app')

const PORT = process.env.PORT || 5000
const MONGO_URI = process.env.MONGO_URI

mongoose.connect(MONGO_URI)
  .then(() => {
    console.log('✅ MongoDB connecté')
    app.listen(PORT, () => {
      console.log(`🚀 Serveur PediCare AI démarré sur le port ${PORT}`)
    })
  })
  .catch((err) => {
    console.error('❌ Erreur connexion MongoDB:', err.message)
    process.exit(1)
  })
