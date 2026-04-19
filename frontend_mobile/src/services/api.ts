import axios from 'axios';
import { Platform } from 'react-native';

// Default back-end URL. On Android emulator, 10.0.2.2 points to host machine.
// On real devices, replace with your machine's local IP (e.g. 192.168.1.XX).
const DEV_URL = Platform.select({
  android: 'http://10.0.2.2:8000',
  ios: 'http://localhost:8000', // Default for simulator
  default: 'http://localhost:8000',
});

export const BASE_URL = DEV_URL;

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Mocking session for now - in a real app, integrate with Supabase Auth
let accessToken: string | null = null;

export const setAuthToken = (token: string | null) => {
  accessToken = token;
};

api.interceptors.request.use(async (config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

export const authAPI = {
  login: (email: string, password: string) => 
    api.post('/auth/login', { email, password }).then((res) => res.data),
  register: (email: string, password: string) => 
    api.post('/auth/register', { email, password }).then((res) => res.data),
};

export const boardAPI = {
  getBoards: () => api.get('/boards/').then((res) => res.data),
  getBoard: (id: string) => api.get(`/boards/${id}`).then((res) => res.data),
  createBoard: (title: string) => api.post('/boards/', { title }).then((res) => res.data),
  updateBoard: (id: string, data: any) => api.put(`/boards/${id}`, data).then((res) => res.data),
  deleteBoard: (id: string) => api.delete(`/boards/${id}`).then((res) => res.data),
  generateAIWorkflow: (id: string, prompt: string) =>
    api.post(`/boards/${id}/generate_ai`, { prompt }).then((res) => res.data),
};

export default api;
