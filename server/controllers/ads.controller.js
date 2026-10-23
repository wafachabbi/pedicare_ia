const path = require('path')
const fs = require('fs')
const Ad = require('../models/Ad')

// GET /api/ads — liste publique (pour le carousel)
const getAds = async (req, res, next) => {
  try {
    const ads = await Ad.find({ active: true }).sort({ order: 1, createdAt: -1 })
    res.json({ success: true, data: ads })
  } catch (err) { next(err) }
}

// GET /api/ads/all — liste complète pour l'admin (actives + inactives)
const getAllAds = async (req, res, next) => {
  try {
    const ads = await Ad.find().sort({ order: 1, createdAt: -1 })
    res.json({ success: true, data: ads })
  } catch (err) { next(err) }
}

// POST /api/ads — créer une pub (multipart/form-data)
const createAd = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Image requise' } })
    }
    const { title, description, badge, badgeColor, link, active, order } = req.body
    if (!title) {
      fs.unlink(req.file.path, () => {})
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Titre requis' } })
    }
    const ad = await Ad.create({
      title,
      description: description || '',
      badge: badge || '',
      badgeColor: badgeColor || 'blue',
      link: link || '#',
      filename: req.file.filename,
      originalName: req.file.originalname,
      mimetype: req.file.mimetype,
      active: active !== 'false',
      order: order ? parseInt(order) : 0
    })
    res.status(201).json({ success: true, data: ad })
  } catch (err) {
    if (req.file) fs.unlink(req.file.path, () => {})
    next(err)
  }
}

// PATCH /api/ads/:id — modifier uniquement les métadonnées (sans image)
const updateAd = async (req, res, next) => {
  try {
    const ad = await Ad.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    )
    if (!ad) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Publicité introuvable' } })
    res.json({ success: true, data: ad })
  } catch (err) { next(err) }
}

// PUT /api/ads/:id — modifier avec nouvelle image optionnelle (multipart/form-data)
const updateAdFull = async (req, res, next) => {
  try {
    const existing = await Ad.findById(req.params.id)
    if (!existing) {
      if (req.file) fs.unlink(req.file.path, () => {})
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Publicité introuvable' } })
    }
    const { title, description, badge, badgeColor, link, active } = req.body
    const update = {
      title: title || existing.title,
      description: description ?? existing.description,
      badge: badge ?? existing.badge,
      badgeColor: badgeColor || existing.badgeColor,
      link: link || existing.link,
      active: active !== undefined ? active !== 'false' : existing.active
    }
    // Si une nouvelle image est fournie, remplacer l'ancienne
    if (req.file) {
      const oldPath = path.join(__dirname, '../uploads', existing.filename)
      fs.unlink(oldPath, () => {})
      update.filename = req.file.filename
      update.originalName = req.file.originalname
      update.mimetype = req.file.mimetype
    }
    const ad = await Ad.findByIdAndUpdate(req.params.id, { $set: update }, { new: true, runValidators: true })
    res.json({ success: true, data: ad })
  } catch (err) {
    if (req.file) fs.unlink(req.file.path, () => {})
    next(err)
  }
}

// DELETE /api/ads/:id
const deleteAd = async (req, res, next) => {
  try {
    const ad = await Ad.findByIdAndDelete(req.params.id)
    if (!ad) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Publicité introuvable' } })
    // Supprimer le fichier image
    const filePath = path.join(__dirname, '../uploads', ad.filename)
    fs.unlink(filePath, () => {})
    res.json({ success: true, message: 'Publicité supprimée' })
  } catch (err) { next(err) }
}

// GET /api/ads/:id/image — servir l'image
const serveAdImage = async (req, res, next) => {
  try {
    const ad = await Ad.findById(req.params.id)
    if (!ad) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Publicité introuvable' } })
    const filePath = path.join(__dirname, '../uploads', ad.filename)
    res.setHeader('Content-Type', ad.mimetype)
    res.sendFile(filePath)
  } catch (err) { next(err) }
}

module.exports = { getAds, getAllAds, createAd, updateAd, updateAdFull, deleteAd, serveAdImage }
