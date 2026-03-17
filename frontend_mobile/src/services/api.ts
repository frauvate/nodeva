import axios from 'axios';
import { Platform } from 'react-native';

// In Expo, localhost refers to the device itself. 
// Use 10.0.2.2 for Android emulator or your machine's IP for real devices.
const BASE_URL = Platform.OS === 'android' ? 'http://10.0.2.2:8000' : 'http://localhost:8000';

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
