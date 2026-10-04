import api from './api'

export const appointmentsService = {
  getAll: (childId) => api.get(`/children/${childId}/appointments`),
  create: (childId, data) => api.post(`/children/${childId}/appointments`, data),
  update: (childId, id, data) => api.put(`/children/${childId}/appointments/${id}`, data),
  delete: (childId, id) => api.delete(`/children/${childId}/appointments/${id}`)
}
