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

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────
const getSystemTheme = (): Theme =>
  window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';

const getStoredTheme = (): Theme | null =>
  localStorage.getItem('app-theme') as Theme | null;

const applyTheme = (t: Theme) => {
  document.documentElement.setAttribute('data-theme', t);
};

// Apply immediately (before React renders) to prevent white-flash
applyTheme(getStoredTheme() ?? getSystemTheme());

// ─────────────────────────────────────────────────────────────

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within a ThemeProvider');
  return context;
};

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>(getStoredTheme() ?? getSystemTheme());
  const [allowThemeToggle, setAllowThemeToggle] = useState<boolean>(true);

  // ── Load DB settings once on mount ────────────────────────
  useEffect(() => {
    const load = async () => {
      try {
        const { data, error } = await supabase
          .from('settings')
          .select('key, value')
          .in('key', ['default_theme', 'allow_theme_toggle', 'accent_color_light', 'accent_color_dark']);

        if (error || !data) return;

        const s = data.reduce((acc, { key, value }) => {
          acc[key] = value;
          return acc;
        }, {} as Record<string, string>);

        // Apply accent colours
        if (s.accent_color_light)
          document.documentElement.style.setProperty('--accent-primary-light', s.accent_color_light);
        if (s.accent_color_dark)
          document.documentElement.style.setProperty('--accent-primary-dark', s.accent_color_dark);

        const toggleAllowed = s.allow_theme_toggle !== 'false';
        setAllowThemeToggle(toggleAllowed);

        // Resolve the admin's intended theme
        const adminDefault = s.default_theme || 'light';
        const resolvedAdminTheme: Theme =
          adminDefault === 'system' ? getSystemTheme() : (adminDefault as Theme);

        if (!toggleAllowed) {
          // ── Admin locked the theme: DB always wins, clear user choice ──
          localStorage.removeItem('app-theme');
          applyTheme(resolvedAdminTheme);
          setThemeState(resolvedAdminTheme);
        } else {
          // ── User may toggle: respect saved preference, fall back to admin default ──
          const stored = getStoredTheme();
          const effective = stored ?? resolvedAdminTheme;
          applyTheme(effective);
          setThemeState(effective);
        }
      } catch (e) {
        console.error('ThemeProvider: failed to load settings', e);
      }
    };

    load();
  }, []);

  // ── Sync to DOM + localStorage whenever theme state changes ─
  useEffect(() => {
    applyTheme(theme);
    // Only persist if toggle is allowed (otherwise we cleared it above)
    if (allowThemeToggle) {
      localStorage.setItem('app-theme', theme);
    }
  }, [theme, allowThemeToggle]);

  // ── System preference listener ───────────────────────────
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      if (allowThemeToggle && !getStoredTheme()) {
        setThemeState(e.matches ? 'dark' : 'light');
      }
    };
    mq.addEventListener('change', handleChange);
    return () => mq.removeEventListener('change', handleChange);
  }, [allowThemeToggle]);

  // ── Public API ──────────────────────────────────────────
  const toggleTheme = () => {
    if (!allowThemeToggle) return;
    setThemeState(prev => (prev === 'light' ? 'dark' : 'light'));
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
