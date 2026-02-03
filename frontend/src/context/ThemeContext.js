import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  // Check if there's a temporary theme override (for login/register pages)
  const [tempThemeOverride, setTempThemeOverride] = useState(null);

  // Initialize theme with value from localStorage or system preference
  const getInitialTheme = () => {
    if (typeof window !== 'undefined') {
      // Use temporary override if set
      if (tempThemeOverride) {
        return tempThemeOverride;
      }

      const savedTheme = localStorage.getItem('theme');
      if (savedTheme) {
        return savedTheme;
      }
      const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      return systemPrefersDark ? 'dark' : 'light';
    }
    return 'light'; // Default for SSR
  };

  const [theme, setTheme] = useState(getInitialTheme);

  useEffect(() => {
    // Apply theme class to document element
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    // Save theme preference to localStorage (but not if it's a temporary override)
    if (!tempThemeOverride) {
      localStorage.setItem('theme', theme);
    }
  }, [theme, tempThemeOverride]);

  useEffect(() => {
    // Apply theme class to document element
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    // Save theme preference to localStorage (but not if it's a temporary override)
    if (!tempThemeOverride) {
      localStorage.setItem('theme', theme);
    }
  }, [theme, tempThemeOverride]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const setTemporaryTheme = (newTheme) => {
    setTempThemeOverride(newTheme);
    setTheme(newTheme); // Update the theme state to reflect the temporary change
  };

  const clearTemporaryTheme = () => {
    setTempThemeOverride(null);
    // Reset to the proper theme based on localStorage/system preference
    const properTheme = localStorage.getItem('theme') ||
      (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    setTheme(properTheme);
  };

  const value = {
    theme,
    toggleTheme,
    isDark: theme === 'dark',
    isLight: theme === 'light',
    setTheme,
    setTemporaryTheme,
    clearTemporaryTheme,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};