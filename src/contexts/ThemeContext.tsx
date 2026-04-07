import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../integrations/supabase/client';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
  allowThemeToggle: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>('light');
  const [allowThemeToggle, setAllowThemeToggle] = useState<boolean>(true);
  const [isInitialized, setIsInitialized] = useState(false);

  // Load theme settings from database on mount
  useEffect(() => {
    const loadThemeSettings = async () => {
      try {
        const { data, error } = await supabase
          .from('settings')
          .select('key, value')
          .in('key', ['default_theme', 'allow_theme_toggle', 'accent_color_light', 'accent_color_dark']);

        if (error) {
          console.error('Error loading theme settings:', error);
          initializeTheme();
          return;
        }

        const settings = data?.reduce((acc, { key, value }) => {
          acc[key] = value;
          return acc;
        }, {} as Record<string, string>) || {};

        // Set allow theme toggle
        setAllowThemeToggle(settings.allow_theme_toggle !== 'false');

        // Apply accent colors if available
        if (settings.accent_color_light) {
          document.documentElement.style.setProperty('--accent-primary-light', settings.accent_color_light);
        }
        if (settings.accent_color_dark) {
          document.documentElement.style.setProperty('--accent-primary-dark', settings.accent_color_dark);
        }

        // Determine initial theme
        const defaultTheme = settings.default_theme || 'light';
        const savedTheme = localStorage.getItem('app-theme') as Theme | null;

        let initialTheme: Theme;

        if (savedTheme) {
          // User has manually set a theme
          initialTheme = savedTheme;
        } else if (defaultTheme === 'system') {
          // Use system preference
          initialTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        } else {
          // Use admin-configured default
          initialTheme = defaultTheme as Theme;
        }

        setThemeState(initialTheme);
        setIsInitialized(true);
      } catch (error) {
        console.error('Error in loadThemeSettings:', error);
        initializeTheme();
      }
    };

    const initializeTheme = () => {
      // Fallback initialization
      const savedTheme = localStorage.getItem('app-theme') as Theme | null;
      if (savedTheme) {
        setThemeState(savedTheme);
      } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        setThemeState('dark');
      } else {
        setThemeState('light');
      }
      setIsInitialized(true);
    };

    loadThemeSettings();
  }, []);

  // Apply theme to document when it changes
  useEffect(() => {
    if (!isInitialized) return;
    
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('app-theme', theme);
  }, [theme, isInitialized]);

  // Listen for system theme changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleChange = (e: MediaQueryListEvent) => {
      // Only auto-switch if user hasn't manually set a theme
      const savedTheme = localStorage.getItem('app-theme');
      if (!savedTheme) {
        setThemeState(e.matches ? 'dark' : 'light');
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const toggleTheme = () => {
    if (!allowThemeToggle) return;
    setThemeState(prev => prev === 'light' ? 'dark' : 'light');
  };

  const setTheme = (newTheme: Theme) => {
    if (!allowThemeToggle) return;
    setThemeState(newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme, allowThemeToggle }}>
      {children}
    </ThemeContext.Provider>
  );
};
