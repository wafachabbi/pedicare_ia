import api from './api'

export const consultationSheetService = {
  generate: (childId, data = {}) => api.post(`/consultation-sheets/children/${childId}`, data),
  getByChild: (childId) => api.get(`/consultation-sheets/children/${childId}`),
  getShared: () => api.get('/consultation-sheets/shared'),
  getOne: (id) => api.get(`/consultation-sheets/${id}`),
  delete: (id) => api.delete(`/consultation-sheets/${id}`)
}
