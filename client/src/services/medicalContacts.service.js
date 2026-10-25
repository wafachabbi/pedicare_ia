import api from './api'

export const medicalContactsService = {
  getAll: (childId) => api.get(`/children/${childId}/medical-contacts`),
  create: (childId, data) => api.post(`/children/${childId}/medical-contacts`, data),
  update: (childId, id, data) => api.put(`/children/${childId}/medical-contacts/${id}`, data),
  delete: (childId, id) => api.delete(`/children/${childId}/medical-contacts/${id}`)
}
