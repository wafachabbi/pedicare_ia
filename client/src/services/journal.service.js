import api from './api'

export const journalService = {
  getAll: (childId) => api.get(`/children/${childId}/journal`),
  create: (childId, data) => api.post(`/children/${childId}/journal`, data),
  update: (childId, id, data) => api.put(`/children/${childId}/journal/${id}`, data),
  delete: (childId, id) => api.delete(`/children/${childId}/journal/${id}`)
}
