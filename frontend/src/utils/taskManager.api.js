import axios from 'axios';

// TaskFlow API - uses same backend as makv (port 5004)
// TaskFlow routes are under /api/taskflow/*
// Force port 5004 for TaskFlow (same as makv backend)
let API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5004/api';

// CRITICAL FIX: Ensure we use port 5004, not 5005
// Replace port 5005 with 5004 if somehow env var has wrong port
if (API_BASE_URL.includes(':5005')) {
  console.warn('⚠️ Detected port 5005 in API URL, fixing to 5004...');
  API_BASE_URL = API_BASE_URL.replace(':5005', ':5004');
}

const TASK_MANAGER_API_URL = `${API_BASE_URL}/taskflow`;

// Debug: Log the API URL to console
console.log('🔗 TaskFlow API URL:', TASK_MANAGER_API_URL);
console.log('🔗 VITE_API_URL:', import.meta.env.VITE_API_URL);
console.log('🔗 Final API Base URL:', API_BASE_URL);

const api = axios.create({
  baseURL: TASK_MANAGER_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('taskManagerToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle responses
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('taskManagerToken');
      localStorage.removeItem('taskManagerUser');
      // Redirect to login if not already there
      if (window.location.pathname !== '/taskflow/login' && window.location.pathname !== '/taskflow/register') {
        window.location.href = '/taskflow/login';
      }
    }
    return Promise.reject(error.response?.data || error.message);
  }
);

export default api;

