// Middleware pour vérifier le rôle de l'utilisateur
// Usage : router.get('/route', auth, checkRole('pediatre'), controller)
const checkRole = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      error: { code: 'FORBIDDEN', message: 'Accès non autorisé pour ce rôle' }
    })
  }
  next()
}

module.exports = checkRole
