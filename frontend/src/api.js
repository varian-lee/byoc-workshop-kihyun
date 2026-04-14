import axios from 'axios'

const BASE_URL = 'http://localhost:28081'

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

export const todoApi = {
  list: () => api.get('/todos'),
  get: (id) => api.get(`/todos/${id}`),
  create: (data) => api.post('/todos', data),
  update: (id, data) => api.put(`/todos/${id}`, data),
  delete: (id) => api.delete(`/todos/${id}`),
  health: () => api.get('/health'),
}

export default api
