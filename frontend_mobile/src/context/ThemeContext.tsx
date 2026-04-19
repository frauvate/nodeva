import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';

export type ThemeType = 'light' | 'dark';

interface ThemeColors {
  background: string;
  surface: string;
  textPrimary: string;
  textSecondary: string;
  textBlack: string;
  border: string;
  dot: string;
  accent: string;
  nodeBlue: string;
  nodeGreen: string;
  nodePurple: string;
}

const lightTheme: ThemeColors = {
  background: '#FAFAFA',
  surface: 'rgba(255, 255, 255, 0.7)',
  textPrimary: '#333333',
  textSecondary: '#666666',
  textBlack: '#000000',
  border: '#EEEEEE',
  dot: 'rgba(0, 0, 0, 0.1)',
  accent: '#000000',
  nodeBlue: '#E3F2FD',
  nodeGreen: '#E8F5E9',
  nodePurple: '#F3E5F5',
};

const darkTheme: ThemeColors = {
  background: '#121212',
  surface: 'rgba(30, 30, 30, 0.7)',
  textPrimary: '#E0E0E0',
  textSecondary: '#B0B0B0',
  textBlack: '#FFFFFF',
  border: '#2C2C2C',
  dot: 'rgba(255, 255, 255, 0.1)',
  accent: '#FFFFFF',
  nodeBlue: '#1A3A5A',
  nodeGreen: '#1B4332',
  nodePurple: '#4A148C',
};

interface ThemeContextType {
  theme: ThemeType;
  colors: ThemeColors;
  toggleTheme: () => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const systemColorScheme = useColorScheme();
  const [theme, setTheme] = useState<ThemeType>(
    systemColorScheme === 'dark' ? 'dark' : 'light'
  );

  useEffect(() => {
    if (systemColorScheme && systemColorScheme !== 'unspecified') {
      setTheme(systemColorScheme as ThemeType);
    }
  }, [systemColorScheme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  const colors = theme === 'light' ? lightTheme : darkTheme;
  const isDark = theme === 'dark';

  return (
    <ThemeContext.Provider value={{ theme, colors, toggleTheme, isDark }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
