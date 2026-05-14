import { create } from 'zustand';
import { teamAPI } from '../services/api';

interface Team {
  id: string;
  name: string;
  owner_id: string;
  members: string[];
}

interface TeamState {
  teams: Team[];
  isLoading: boolean;
  error: string | null;
  fetchTeams: () => Promise<void>;
   createTeam: (name: string) => Promise<void>;
  inviteMember: (teamId: string, email: string) => Promise<void>;
  deleteTeam: (teamId: string) => Promise<void>;
  updateTeam: (teamId: string, name: string) => Promise<void>;
}

export const useTeamStore = create<TeamState>((set) => ({
  teams: [],
  isLoading: false,
  error: null,

  fetchTeams: async () => {
    set({ isLoading: true });
    try {
      const teams = await teamAPI.getTeams();
      set({ teams, isLoading: false });
    } catch (err) {
      set({ error: 'Ekipler yüklenemedi.', isLoading: false });
    }
  },

  createTeam: async (name: string) => {
    set({ isLoading: true, error: null });
    try {
      const newTeam = await teamAPI.createTeam(name);
      set((state) => ({ 
        teams: [...state.teams, newTeam],
        isLoading: false 
      }));
    } catch (err) {
      set({ error: 'Ekip oluşturulamadı.', isLoading: false });
    }
  },

  inviteMember: async (teamId: string, email: string) => {
    set({ isLoading: true, error: null });
    try {
      await teamAPI.inviteMember(teamId, email);
      const teams = await teamAPI.getTeams(); // Refresh
      set({ teams, isLoading: false });
    } catch (err) {
      set({ error: 'Davet gönderilemedi.', isLoading: false });
    }
  },

  deleteTeam: async (teamId: string) => {
    set({ isLoading: true, error: null });
    try {
      await teamAPI.deleteTeam(teamId);
      set((state) => ({
        teams: state.teams.filter(t => t.id !== teamId),
        isLoading: false
      }));
    } catch (err) {
      set({ error: 'Ekip silinemedi.', isLoading: false });
    }
  },

  updateTeam: async (teamId: string, name: string) => {
    set({ isLoading: true, error: null });
    try {
      const updated = await teamAPI.updateTeam(teamId, name);
      set((state) => ({
        teams: state.teams.map(t => t.id === teamId ? updated : t),
        isLoading: false
      }));
    } catch (err) {
      set({ error: 'Ekip güncellenemedi.', isLoading: false });
    }
  },
}));
