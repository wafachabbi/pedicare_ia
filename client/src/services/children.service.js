import api from './api'

export const childrenService = {
  async getAll() {
    const res = await api.get('/children')
    return res.data
  },
  async getOne(id) {
    const res = await api.get(`/children/${id}`)
    return res.data
  },
  async create(data) {
    const res = await api.post('/children', data)
    return res.data
  },
  async update(id, data) {
    const res = await api.put(`/children/${id}`, data)
    return res.data
  },
  async remove(id) {
    const res = await api.delete(`/children/${id}`)
    return res.data
  }
}
