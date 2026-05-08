import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';

export type ThemeType = 'light' | 'dark';

interface ThemeColors {
    background: string;
    surface: string;
    surfaceStrong: string;
    textPrimary: string;
    textSecondary: string;
    textMuted: string;
    border: string;
    borderSubtle: string;
    accent: string;
    accentSoft: string;
    accentText: string;
    nodeBlue: string;
    nodeGreen: string;
    nodePurple: string;
    nodeYellow: string;
    nodePink: string;
    nodeOrange: string;
    nodeTextBlue: string;
    nodeTextGreen: string;
    error: string;
    success: string;
}

const lightTheme: ThemeColors = {
    background: '#ffffff',
    surface: 'rgba(255, 255, 255, 0.75)',
    surfaceStrong: 'rgba(255, 255, 255, 0.92)',
    textPrimary: '#1e1e2e',
    textSecondary: '#6b7280',
    textMuted: '#9ca3af',
    border: 'rgba(0, 0, 0, 0.07)',
    borderSubtle: 'rgba(99, 102, 241, 0.12)',
    accent: '#6366f1',
    accentSoft: 'rgba(99, 102, 241, 0.08)',
    accentText: '#ffffff',
    nodeBlue: '#dbeafe',
    nodeGreen: '#dcfce7',
    nodePurple: '#f3e8ff',
    nodeYellow: '#fef9c3',
    nodePink: '#fce7f3',
    nodeOrange: '#ffedd5',
    nodeTextBlue: '#1d4ed8',
    nodeTextGreen: '#15803d',
    error: '#ef4444',
    success: '#10b981',
};

const darkTheme: ThemeColors = {
    background: '#111118',
    surface: 'rgba(255, 255, 255, 0.05)',
    surfaceStrong: 'rgba(255, 255, 255, 0.08)',
    textPrimary: '#e2e4f0',
    textSecondary: '#8b8fa8',
    textMuted: '#5c5f72',
    border: 'rgba(255, 255, 255, 0.08)',
    borderSubtle: 'rgba(129, 140, 248, 0.15)',
    accent: '#818cf8',
    accentSoft: 'rgba(129, 140, 248, 0.1)',
    accentText: '#ffffff',
    nodeBlue: 'rgba(29, 78, 216, 0.18)',
    nodeGreen: 'rgba(21, 128, 61, 0.18)',
    nodePurple: 'rgba(124, 58, 237, 0.15)',
    nodeYellow: 'rgba(161, 98, 7, 0.15)',
    nodePink: 'rgba(190, 18, 60, 0.15)',
    nodeOrange: 'rgba(194, 65, 12, 0.15)',
    nodeTextBlue: '#93c5fd',
    nodeTextGreen: '#86efac',
    error: '#f87171',
    success: '#34d399',
};

interface ThemeContextType {
    theme: ThemeType;
    colors: ThemeColors;
    toggleTheme: () => void;
    isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const systemScheme = useColorScheme();
    const [theme, setTheme] = useState<ThemeType>(systemScheme === 'dark' ? 'dark' : 'light');

    useEffect(() => {
        if (systemScheme) setTheme(systemScheme as ThemeType);
    }, [systemScheme]);

    const toggleTheme = () => setTheme((p) => (p === 'light' ? 'dark' : 'light'));
    const colors = theme === 'light' ? lightTheme : darkTheme;
    const isDark = theme === 'dark';

    return (
        <ThemeContext.Provider value={{ theme, colors, toggleTheme, isDark }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => {
    const ctx = useContext(ThemeContext);
    if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
    return ctx;
};
