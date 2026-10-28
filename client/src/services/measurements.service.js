import api from './api'

// Service pour les parents
export const measurementsService = {
  getAll: (childId) => api.get(`/children/${childId}/measurements`),
  create: (childId, data) => api.post(`/children/${childId}/measurements`, data),
  update: (childId, id, data) => api.put(`/children/${childId}/measurements/${id}`, data),
  delete: (childId, id) => api.delete(`/children/${childId}/measurements/${id}`)
}

// Service pour les pédiatres
export const pediatreMeasurementsService = {
  getAll: (childId) => api.get(`/pediatre/patients/${childId}/measurements`),
  create: (childId, data) => api.post(`/pediatre/patients/${childId}/measurements`, data),
  update: (childId, id, data) => api.put(`/pediatre/patients/${childId}/measurements/${id}`, data),
  delete: (childId, id) => api.delete(`/pediatre/patients/${childId}/measurements/${id}`)
}
