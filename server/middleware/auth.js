const jwt = require('jsonwebtoken')

const auth = (req, res, next) => {
  // Accepte le token depuis le header Authorization OU depuis ?token= (pour les fichiers statiques)
  let token = null

  const authHeader = req.headers.authorization
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1]
  } else if (req.query.token) {
    token = req.query.token
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Token d\'authentification manquant' }
    })
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    req.user = decoded
    next()
  } catch (err) {
    return res.status(401).json({
      success: false,
      error: { code: 'INVALID_TOKEN', message: 'Token invalide ou expiré' }
    })
  }
}

module.exports = auth
