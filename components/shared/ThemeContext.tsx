
import React, { createContext, useState, useEffect, useContext, ReactNode, useCallback, useMemo } from 'react';
import type { Theme } from '../../types';

interface ThemeContextType {
    theme: Theme;
    setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Function to get initial theme, matching the FOUC script in index.html
const getInitialTheme = (): Theme => {
    try {
        const savedTheme = localStorage.getItem('onlyhelio-theme') as Theme;
        if (savedTheme && (savedTheme === 'dark' || savedTheme === 'light')) {
            return savedTheme;
        }
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    } catch (error) {
        console.error("Failed to read theme preference", error);
        return 'light';
    }
};

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [theme, setThemeState] = useState<Theme>(getInitialTheme);

    const setTheme = useCallback((newTheme: Theme) => {
        try {
            // 1. Update localStorage to persist the choice
            localStorage.setItem('onlyhelio-theme', newTheme);
            
            // 2. Update the DOM class directly for an immediate visual change
            const root = window.document.documentElement;
            if (newTheme === 'dark') {
                root.classList.add('dark');
            } else {
                root.classList.remove('dark');
            }

            // 3. Update React state to re-render components that depend on the theme (like the toggle icon)
            setThemeState(newTheme);
        } catch (error) {
            console.error("Failed to set theme", error);
        }
    }, []);

    const value = useMemo(() => ({ theme, setTheme }), [theme, setTheme]);

    return (
        <ThemeContext.Provider value={value}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = (): ThemeContextType => {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};
