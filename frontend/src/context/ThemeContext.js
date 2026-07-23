import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  const [tempThemeOverride, setTempThemeOverride] = useState(null);

  const getInitialTheme = () => {
    if (typeof window !== 'undefined') {
      if (tempThemeOverride) return tempThemeOverride;
      const savedTheme = localStorage.getItem('theme');
      if (savedTheme) return savedTheme;
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'light';
  };

  const [theme, setTheme] = useState(getInitialTheme);

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    if (!tempThemeOverride) {
      localStorage.setItem('theme', theme);
    }
  }, [theme, tempThemeOverride]);

  const toggleTheme = useCallback(() => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  }, []);

  const setTemporaryTheme = useCallback((newTheme) => {
    setTempThemeOverride(newTheme);
    setTheme(newTheme);
  }, []);

  const clearTemporaryTheme = useCallback(() => {
    setTempThemeOverride(null);
    const properTheme = localStorage.getItem('theme') ||
      (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    setTheme(properTheme);
  }, []);

  const value = useMemo(() => ({
    theme,
    toggleTheme,
    isDark: theme === 'dark',
    isLight: theme === 'light',
    setTheme,
    setTemporaryTheme,
    clearTemporaryTheme,
  }), [theme, toggleTheme, setTemporaryTheme, clearTemporaryTheme]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};
