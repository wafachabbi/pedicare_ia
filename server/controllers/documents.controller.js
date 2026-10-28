const path = require('path')
const fs = require('fs')
const Document = require('../models/Document')
const Child = require('../models/Child')

const ownsChild = async (childId, userId) => {
  const child = await Child.findOne({ _id: childId, parentId: userId })
  return !!child
}

// GET /api/children/:childId/documents
const getDocuments = async (req, res, next) => {
  try {
    if (!await ownsChild(req.params.childId, req.user.id)) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Enfant introuvable' } })
    }
    const documents = await Document.find({ childId: req.params.childId }).sort({ date: -1 })
    res.json({ success: true, data: documents })
  } catch (err) { next(err) }
}

// POST /api/children/:childId/documents  (multipart/form-data)
const uploadDocument = async (req, res, next) => {
  try {
    if (!await ownsChild(req.params.childId, req.user.id)) {
      // Supprimer le fichier uploadé si ownership échoue
      if (req.file) fs.unlink(req.file.path, () => {})
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Enfant introuvable' } })
    }
    if (!req.file) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Fichier requis' } })
    }

    const { category, notes, date } = req.body
    const document = await Document.create({
      childId: req.params.childId,
      originalName: req.file.originalname,
      filename: req.file.filename,
      mimetype: req.file.mimetype,
      size: req.file.size,
      category: category || 'autre',
      notes: notes || '',
      date: date ? new Date(date) : new Date()
    })
    res.status(201).json({ success: true, data: document })
  } catch (err) {
    if (req.file) fs.unlink(req.file.path, () => {})
    next(err)
  }
}

// DELETE /api/children/:childId/documents/:id
const deleteDocument = async (req, res, next) => {
  try {
    if (!await ownsChild(req.params.childId, req.user.id)) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Enfant introuvable' } })
    }
    const document = await Document.findOneAndDelete({ _id: req.params.id, childId: req.params.childId })
    if (!document) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Document introuvable' } })
    }
    // Supprimer le fichier physique
    const filePath = path.join(__dirname, '../uploads', document.filename)
    fs.unlink(filePath, () => {}) // silencieux si déjà supprimé
    res.json({ success: true, message: 'Document supprimé' })
  } catch (err) { next(err) }
}

// GET /api/children/:childId/documents/:id/file  — téléchargement du fichier
const serveDocument = async (req, res, next) => {
  try {
    if (!await ownsChild(req.params.childId, req.user.id)) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Enfant introuvable' } })
    }
    const document = await Document.findOne({ _id: req.params.id, childId: req.params.childId })
    if (!document) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Document introuvable' } })
    }
    const filePath = path.join(__dirname, '../uploads', document.filename)
    res.setHeader('Content-Disposition', `inline; filename="${document.originalName}"`)
    res.setHeader('Content-Type', document.mimetype)
    res.sendFile(filePath)
  } catch (err) { next(err) }
}

module.exports = { getDocuments, uploadDocument, deleteDocument, serveDocument }
