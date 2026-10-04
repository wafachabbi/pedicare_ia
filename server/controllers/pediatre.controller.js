const User = require('../models/User')

// GET /api/pediatre/profile
const getProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select('-password')
    if (!user) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Profil introuvable' }
      })
    }
    res.json({ success: true, data: user })
  } catch (err) {
    next(err)
  }
}

// PUT /api/pediatre/profile
const updateProfile = async (req, res, next) => {
  try {
    const { fullName, speciality, phone } = req.body
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $set: { fullName, speciality, phone } },
      { new: true, runValidators: true }
    ).select('-password')
    res.json({ success: true, data: user })
  } catch (err) {
    next(err)
  }
}

module.exports = { getProfile, updateProfile }
