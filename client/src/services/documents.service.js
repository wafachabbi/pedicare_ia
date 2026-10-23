import api from './api'

export const documentsService = {
  getAll: (childId) => api.get(`/children/${childId}/documents`),

  upload: (childId, formData) =>
    api.post(`/children/${childId}/documents`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }),

  delete: (childId, id) => api.delete(`/children/${childId}/documents/${id}`),

  // Retourne l'URL complète pour afficher/télécharger un fichier
  getFileUrl: (childId, id) => `/api/children/${childId}/documents/${id}/file`
}
