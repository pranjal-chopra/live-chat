import axios from 'axios'

const api = axios.create({
  baseURL: '/',  // Vite proxy handles routing to Flask
})

// interceptor: runs before every request
// automatically adds Authorization header if token exists
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export default api
