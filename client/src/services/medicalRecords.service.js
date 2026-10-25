import api from './api'

export const medicalRecordsService = {
  getAll: (childId) => api.get(`/children/${childId}/medical-records`),
  create: (childId, data) => api.post(`/children/${childId}/medical-records`, data),
  update: (childId, id, data) => api.put(`/children/${childId}/medical-records/${id}`, data),
  delete: (childId, id) => api.delete(`/children/${childId}/medical-records/${id}`)
}
