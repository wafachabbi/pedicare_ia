import api from './api'

export const measurementsService = {
  getAll: (childId) => api.get(`/children/${childId}/measurements`),
  create: (childId, data) => api.post(`/children/${childId}/measurements`, data),
  update: (childId, id, data) => api.put(`/children/${childId}/measurements/${id}`, data),
  delete: (childId, id) => api.delete(`/children/${childId}/measurements/${id}`)
}
