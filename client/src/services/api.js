import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' }
})

// Intercepteur : ajoute le token JWT si présent
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('pedicare_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Intercepteur : gestion globale 401 (token expiré)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('pedicare_token')
      localStorage.removeItem('pedicare_user')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default api
