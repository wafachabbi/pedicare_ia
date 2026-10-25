import api from './api'

export const notesService = {
  getPatients: () => api.get('/notes/patients'),
  getAll: (childId) => api.get('/notes', { params: childId ? { childId } : {} }),
  create: (data) => api.post('/notes', data),
  update: (id, data) => api.put(`/notes/${id}`, data),
  delete: (id) => api.delete(`/notes/${id}`)
}
