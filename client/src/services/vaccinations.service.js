import api from './api'

export const vaccinationsService = {
  getAll: (childId) => api.get(`/children/${childId}/vaccinations`),
  create: (childId, data) => api.post(`/children/${childId}/vaccinations`, data),
  update: (childId, id, data) => api.put(`/children/${childId}/vaccinations/${id}`, data),
  delete: (childId, id) => api.delete(`/children/${childId}/vaccinations/${id}`)
}
