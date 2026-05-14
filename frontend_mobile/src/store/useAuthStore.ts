import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { setAuthToken } from '../services/api';

interface User {
    id: string;
    email: string;
    avatar_url?: string;
}

interface AuthState {
    user: User | null;
    isLoading: boolean;
    error: string | null;
    mode: 'login' | 'register';

    setMode: (mode: 'login' | 'register') => void;
    login: (email: string, password: string) => Promise<boolean>;
    register: (email: string, password: string) => Promise<boolean>;
    logout: () => Promise<void>;
    checkAuth: () => Promise<void>;
    clearError: () => void;
    updateProfile: (updates: Partial<User>) => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
    user: null,
    isLoading: true,
    error: null,
    mode: 'login',

    setMode: (mode) => set({ mode, error: null }),

    clearError: () => set({ error: null }),

    login: async (email, password) => {
        set({ isLoading: true, error: null });
        try {
            const { data, error } = await supabase.auth.signInWithPassword({ email, password });
            if (error) throw error;
            const session = data.session;
            if (session) {
                setAuthToken(session.access_token);
                set({
                    user: { id: data.user!.id, email: data.user!.email! },
                    isLoading: false,
                });
                return true;
            }
            throw new Error('Oturum alınamadı.');
        } catch (err: any) {
            const msg =
                err.message?.includes('Invalid login') ? 'E-posta veya şifre hatalı.' :
                err.message?.includes('Email not confirmed') ? 'E-postanızı doğrulamanız gerekiyor.' :
                err.message || 'Giriş yapılamadı.';
            set({ error: msg, isLoading: false });
            return false;
        }
    },

    register: async (email, password) => {
        set({ isLoading: true, error: null });
        try {
            const { data, error } = await supabase.auth.signUp({ email, password });
            if (error) throw error;
            if (data.user && !data.session) {
                // E-posta doğrulaması gerekiyor
                set({ isLoading: false, error: '✉️ Doğrulama e-postası gönderildi. Gelen kutunuzu kontrol edin.' });
                return false;
            }
            if (data.session) {
                setAuthToken(data.session.access_token);
                set({
                    user: { id: data.user!.id, email: data.user!.email! },
                    isLoading: false,
                });
                return true;
            }
            throw new Error('Kayıt tamamlanamadı.');
        } catch (err: any) {
            const msg =
                err.message?.includes('already registered') ? 'Bu e-posta zaten kayıtlı.' :
                err.message?.includes('Password should be') ? 'Şifre en az 6 karakter olmalı.' :
                err.message || 'Kayıt oluşturulamadı.';
            set({ error: msg, isLoading: false });
            return false;
        }
    },

    logout: async () => {
        await supabase.auth.signOut();
        setAuthToken(null);
        set({ user: null });
    },

    checkAuth: async () => {
        set({ isLoading: true });
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
                setAuthToken(session.access_token);
                set({
                    user: { 
                        id: session.user.id, 
                        email: session.user.email!,
                        avatar_url: session.user.user_metadata?.avatar_url
                    },
                    isLoading: false,
                });
            } else {
                set({ isLoading: false });
            }
        } catch {
            set({ isLoading: false });
        }
    },

    updateProfile: async (updates) => {
        set((state) => ({
            user: state.user ? { ...state.user, ...updates } : null
        }));
    },
}));
