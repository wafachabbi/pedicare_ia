import api from './api'

export const milestonesService = {
  getAll: (childId) => api.get(`/children/${childId}/milestones`),
  create: (childId, data) => api.post(`/children/${childId}/milestones`, data),
  update: (childId, id, data) => api.put(`/children/${childId}/milestones/${id}`, data),
  delete: (childId, id) => api.delete(`/children/${childId}/milestones/${id}`)
}
