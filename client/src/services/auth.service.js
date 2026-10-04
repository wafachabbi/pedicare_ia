import api from './api'

export const authService = {
  async register(email, password, role = 'parent', extra = {}) {
    const res = await api.post('/auth/register', { email, password, role, ...extra })
    return res.data
  },
  async login(email, password) {
    const res = await api.post('/auth/login', { email, password })
    return res.data
  }
}
