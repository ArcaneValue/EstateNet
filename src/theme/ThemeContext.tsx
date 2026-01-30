import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Colors, Theme, ColorScheme } from './colors';
import { Typography } from './typography';
import { Spacing, BorderRadius, Shadows } from './spacing';

interface ThemeContextType {
    theme: Theme;
    colors: ColorScheme;
    typography: typeof Typography;
    spacing: typeof Spacing;
    borderRadius: typeof BorderRadius;
    shadows: typeof Shadows;
    toggleTheme: () => void;
    setTheme: (theme: Theme) => void;
    isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
    children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
    // Default to light theme for sign in/login screens
    const [theme, setTheme] = useState<Theme>('light');

    const toggleTheme = () => {
        setTheme((prevTheme) => (prevTheme === 'light' ? 'dark' : 'light'));
    };

    const value: ThemeContextType = {
        theme,
        colors: Colors[theme],
        typography: Typography,
        spacing: Spacing,
        borderRadius: BorderRadius,
        shadows: Shadows,
        toggleTheme,
        setTheme,
        isDark: theme === 'dark',
    };

    return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = (): ThemeContextType => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};
