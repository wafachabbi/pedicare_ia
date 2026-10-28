import api from './api'

export const adsService = {
  // Public — carousel
  getActive: () => api.get('/ads'),

  // Admin
  getAll: () => api.get('/ads/all'),

  create: (formData) => api.post('/ads', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),

  update: (id, data) => api.patch(`/ads/${id}`, data),

  updateFull: (id, formData) => api.put(`/ads/${id}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),

  delete: (id) => api.delete(`/ads/${id}`),

  // URL directe de l'image (pas besoin d'auth)
  getImageUrl: (id) => `/api/ads/${id}/image`
}
