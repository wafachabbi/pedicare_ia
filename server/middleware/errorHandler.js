const errorHandler = (err, req, res, next) => {
  const status = err.status || 500
  const message = process.env.NODE_ENV === 'production'
    ? 'Une erreur est survenue.'
    : err.message || 'Une erreur est survenue.'

  // Ne jamais exposer les détails d'erreur LLM ou les clés API
  const code = err.code || 'INTERNAL_ERROR'

  res.status(status).json({
    success: false,
    error: { code, message }
  })
}

module.exports = errorHandler
