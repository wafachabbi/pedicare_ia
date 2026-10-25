import api from './api'

export const questionsService = {
  getAll: (childId, params = {}) => api.get(`/children/${childId}/questions`, { params }),
  create: (childId, data) => api.post(`/children/${childId}/questions`, data),
  update: (childId, id, data) => api.put(`/children/${childId}/questions/${id}`, data),
  delete: (childId, id) => api.delete(`/children/${childId}/questions/${id}`)
}
