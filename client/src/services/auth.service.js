import api from './api'

export const authService = {
  async register(email, password) {
    const res = await api.post('/auth/register', { email, password })
    return res.data
  },
  async login(email, password) {
    const res = await api.post('/auth/login', { email, password })
    return res.data
  }
}
