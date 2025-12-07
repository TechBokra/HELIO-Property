import React from 'react';
import { useTheme } from './ThemeContext';
import { SunIcon, MoonIcon } from '../ui/Icons';

const ThemeToggle: React.FC = () => {
    const { theme, setTheme } = useTheme();

    return (
        <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="text-gray-500 dark:text-gray-400 hover:text-amber-500 dark:hover:text-amber-400 transition-colors"
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        >
            {theme === 'dark' ? (
                <MoonIcon className="h-6 w-6" />
            ) : (
                <SunIcon className="h-6 w-6" />
            )}
        </button>
    );
};

export default ThemeToggle;
