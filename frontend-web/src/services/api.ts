import axios from 'axios';
import { supabase } from '../lib/supabase';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const api = axios.create({
    baseURL: API_URL,
});

api.interceptors.request.use(async (config) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
        config.headers.Authorization = `Bearer ${session.access_token}`;
    }
    return config;
});

export const boardAPI = {
    getBoards: () => api.get('/boards/').then(res => res.data),
    getBoard: (id: string) => api.get(`/boards/${id}`).then(res => res.data),
    createBoard: (title: string, team_id?: string) => api.post('/boards/', { title, team_id }).then(res => res.data),
    updateBoard: (id: string, data: any) => api.put(`/boards/${id}`, data).then(res => res.data),
    deleteBoard: (id: string) => api.delete(`/boards/${id}`).then(res => res.data),
    generateAIWorkflow: (id: string, prompt: string) =>
        api.post(`/boards/${id}/generate_ai`, { prompt }).then(res => res.data),
};

export const teamAPI = {
    getTeams: () => api.get('/teams/').then(res => res.data),
    createTeam: (name: string) => api.post('/teams/', { name }).then(res => res.data),
    deleteTeam: (teamId: string) => api.delete(`/teams/${teamId}`).then(res => res.data),
    inviteMember: (teamId: string, email: string) =>
        api.post(`/teams/${teamId}/invite`, { email }).then(res => res.data),
    removeMember: (teamId: string, memberEmail: string) =>
        api.delete(`/teams/${teamId}/members/${encodeURIComponent(memberEmail)}`).then(res => res.data),
    getIncomingRequests: () => api.get('/teams/requests/incoming').then(res => res.data),
    acceptRequest: (reqId: string) => api.post(`/teams/requests/${reqId}/accept`).then(res => res.data),
    rejectRequest: (reqId: string) => api.post(`/teams/requests/${reqId}/reject`).then(res => res.data),
};

export default api;

