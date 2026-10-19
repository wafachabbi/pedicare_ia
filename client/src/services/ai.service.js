import api from './api'

export const aiService = {
  getSummary: (childId) => api.post(`/ai/summary/${childId}`),
  getReminders: (childId) => api.post(`/ai/reminders/${childId}`)
}
