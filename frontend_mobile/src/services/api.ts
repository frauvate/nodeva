import axios from 'axios';
import { Platform } from 'react-native';
import { supabase } from '../lib/supabase';

// Yerel ağdaki tüm cihazların (telefon dahil) bağlanabilmesi için
// bilgisayarın yerel IP adresi kullanılıyor.
const BASE_URL = 'http://192.168.1.105:8001';

export { BASE_URL };

const api = axios.create({
    baseURL: BASE_URL,
    headers: { 'Content-Type': 'application/json' },
    timeout: 10000,
});

// ── Auth Token ──────────────────────────────────────────────────
let _accessToken: string | null = null;

export const setAuthToken = (token: string | null) => {
    _accessToken = token;
};

api.interceptors.request.use(async (config) => {
    // Önce bellekteki token'ı dene, yoksa Supabase session'ından al
    let token = _accessToken;
    if (!token) {
        const { data: { session } } = await supabase.auth.getSession();
        token = session?.access_token ?? null;
    }
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

// ── Board API ───────────────────────────────────────────────────
export const boardAPI = {
    getBoards: () => api.get('/boards/').then((r) => r.data),
    getBoard: (id: string) => api.get(`/boards/${id}`).then((r) => r.data),
    createBoard: (title: string, team_id?: string, template?: string) =>
        api.post('/boards/', { title, team_id, template }).then((r) => r.data),
    updateBoard: (id: string, data: any) =>
        api.put(`/boards/${id}`, data).then((r) => r.data),
    deleteBoard: (id: string) => api.delete(`/boards/${id}`).then((r) => r.data),
    generateAIWorkflow: (id: string, prompt: string) =>
        api.post(`/boards/${id}/generate_ai`, { prompt }).then((r) => r.data),
};

// ── Team API ────────────────────────────────────────────────────
export const teamAPI = {
    getTeams: () => api.get('/teams/').then((r) => r.data),
    createTeam: (name: string) => api.post('/teams/', { name }).then((r) => r.data),
    updateTeam: (id: string, name: string) => api.put(`/teams/${id}`, { name }).then((r) => r.data),
    deleteTeam: (teamId: string) => api.delete(`/teams/${teamId}`).then((r) => r.data),
    inviteMember: (teamId: string, email: string) =>
        api.post(`/teams/${teamId}/invite`, { email }).then((r) => r.data),
    removeMember: (teamId: string, memberEmail: string) =>
        api.delete(`/teams/${teamId}/members/${encodeURIComponent(memberEmail)}`).then((r) => r.data),
    getIncomingRequests: () => api.get('/teams/requests/incoming').then((r) => r.data),
    acceptRequest: (reqId: string) => api.post(`/teams/requests/${reqId}/accept`).then((r) => r.data),
    rejectRequest: (reqId: string) => api.post(`/teams/requests/${reqId}/reject`).then((r) => r.data),
};

// ── Notification API ────────────────────────────────────────────
export const notificationAPI = {
    getNotifications: () => api.get('/notifications/').then((r) => r.data),
    markRead: (id: string) => api.post(`/notifications/${id}/read`).then((r) => r.data),
    markAllRead: () => api.post('/notifications/read-all').then((r) => r.data),
    deleteNotification: (id: string) => api.delete(`/notifications/${id}`).then((r) => r.data),
};

// ── User API ────────────────────────────────────────────────────
export const userAPI = {
    searchUser: (email: string) => api.get(`/users/search?email=${encodeURIComponent(email)}`).then((r) => r.data),
    getBoardMembers: (boardId: string) => api.get(`/users/members/${boardId}`).then((r) => r.data),
    updateProfile: (updates: any) => api.put('/users/profile', updates).then((r) => r.data),
    shareBoard: (boardId: string, email: string) => api.post('/users/share-board', { board_id: boardId, email }).then((r) => r.data),
};

export default api;
