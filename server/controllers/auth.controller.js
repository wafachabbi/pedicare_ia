const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const User = require('../models/User')

const GENERIC_AUTH_ERROR = {
  success: false,
  error: { code: 'INVALID_CREDENTIALS', message: 'Identifiants invalides' }
}

// POST /api/auth/register
const register = async (req, res, next) => {
  try {
    const { email, password, role = 'parent', fullName, speciality, phone } = req.body

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Email et mot de passe requis' }
      })
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Le mot de passe doit contenir au moins 6 caractères' }
      })
    }

    if (!['parent', 'pediatre'].includes(role)) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Rôle invalide' }
      })
    }

    const existing = await User.findOne({ email: email.toLowerCase() })
    if (existing) {
      return res.status(400).json({
        success: false,
        error: { code: 'EMAIL_TAKEN', message: 'Cette adresse email est déjà utilisée' }
      })
    }

    const saltRounds = 12
    const hashedPassword = await bcrypt.hash(password, saltRounds)

    const userData = {
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      role
    }

    // Champs supplémentaires pour le pédiatre
    if (role === 'pediatre') {
      if (fullName) userData.fullName = fullName
      if (speciality) userData.speciality = speciality
      if (phone) userData.phone = phone
    }

    const user = await User.create(userData)

    const token = jwt.sign(
      { id: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    )

    res.status(201).json({
      success: true,
      data: {
        token,
        user: { id: user._id, email: user.email, role: user.role, fullName: user.fullName }
      }
    })
  } catch (err) {
    next(err)
  }
}

// POST /api/auth/login
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(401).json(GENERIC_AUTH_ERROR)
    }

    const user = await User.findOne({ email: email.toLowerCase() })

    if (!user) {
      await bcrypt.compare(password, '$2a$12$invalidhashfortimingattackprevention')
      return res.status(401).json(GENERIC_AUTH_ERROR)
    }

    const isMatch = await bcrypt.compare(password, user.password)
    if (!isMatch) {
      return res.status(401).json(GENERIC_AUTH_ERROR)
    }

    const token = jwt.sign(
      { id: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    )

    res.json({
      success: true,
      data: {
        token,
        user: { id: user._id, email: user.email, role: user.role, fullName: user.fullName }
      }
    })
  } catch (err) {
    next(err)
  }
}

module.exports = { register, login }
