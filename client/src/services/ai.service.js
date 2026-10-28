import api from './api'

export const aiService = {
  getSummary: (childId) => api.post(`/ai/summary/${childId}`),
  getReminders: (childId) => api.post(`/ai/reminders/${childId}`),
  analyzeGrowth: (childId) => api.post(`/ai/growth/${childId}`),
  analyzeMilestones: (childId) => api.post(`/ai/milestones/${childId}`),
  summarizeJournal: (childId) => api.post(`/ai/journal/${childId}`),
  analyzeImage: (filename) => api.post('/ai/analyze-image', { filename })
}
