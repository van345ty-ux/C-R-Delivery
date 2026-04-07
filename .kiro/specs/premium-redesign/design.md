# Design Document - Premium Redesign

## Overview

Este documento descreve o design completo do redesign premium do aplicativo, incluindo sistema de temas, nova paleta de cores, tipografia, componentes e layout.

## Architecture

### Theme System Architecture

```
┌─────────────────────────────────────────┐
│         ThemeProvider Context           │
│  - currentTheme: 'light' | 'dark'       │
│  - toggleTheme()                        │
│  - setTheme(theme)                      │
└─────────────────────────────────────────┘
                    │
                    ├─> localStorage persistence
                    ├─> CSS variables injection
                    └─> Component re-rendering
```

### Color System Architecture

```
CSS Variables (Dynamic)
├─ Light Theme
│  ├─ --bg-primary: #FFFFFF
│  ├─ --bg-secondary: #F8F9FA
│  ├─ --text-primary: #0A0A0A
│  ├─ --text-secondary: #6B7280
│  ├─ --accent-primary: #D4AF37
│  └─ --accent-secondary: #B8960F
│
└─ Dark Theme
   ├─ --bg-primary: #0A0A0A
   ├─ --bg-secondary: #1A1A1A
   ├─ --text-primary: #FFFFFF
   ├─ --text-secondary: #9CA3AF
   ├─ --accent-primary: #F4D03F
   └─ --accent-secondary: #D4AF37
```

## Components and Interfaces

### 1. ThemeProvider Component

```typescript
interface ThemeContextType {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  setTheme: (theme: 'light' | 'dark') => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<'light' | 'dark'>('light');
  
  // Detecta preferência do sistema
  // Persiste no localStorage
  // Aplica CSS variables
  
  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};
```

### 2. Premium Color Palette

#### Light Theme
```css
--bg-primary: #FFFFFF;
--bg-secondary: #F8F9FA;
--bg-tertiary: #F3F4F6;
--text-primary: #0A0A0A;
--text-secondary: #4B5563;
--text-tertiary: #6B7280;
--accent-primary: #D4AF37; /* Gold */
--accent-secondary: #B8960F; /* Dark Gold */
--accent-hover: #E5C158;
--border-primary: #E5E7EB;
--border-secondary: #D1D5DB;
--shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
--shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
--shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
--shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
```

#### Dark Theme
```css
--bg-primary: #0A0A0A;
--bg-secondary: #1A1A1A;
--bg-tertiary: #2A2A2A;
--text-primary: #FFFFFF;
--text-secondary: #D1D5DB;
--text-tertiary: #9CA3AF;
--accent-primary: #F4D03F; /* Bright Gold */
--accent-secondary: #D4AF37; /* Gold */
--accent-hover: #FFE55C;
--border-primary: #374151;
--border-secondary: #4B5563;
--shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.3);
--shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.4);
--shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.5);
--shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.6);
```

### 3. Typography System

```css
/* Premium Fonts */
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700&family=Inter:wght@300;400;500;600;700&display=swap');

--font-display: 'Playfair Display', serif;
--font-body: 'Inter', sans-serif;

/* Type Scale */
--text-xs: 0.75rem;    /* 12px */
--text-sm: 0.875rem;   /* 14px */
--text-base: 1rem;     /* 16px */
--text-lg: 1.125rem;   /* 18px */
--text-xl: 1.25rem;    /* 20px */
--text-2xl: 1.5rem;    /* 24px */
--text-3xl: 1.875rem;  /* 30px */
--text-4xl: 2.25rem;   /* 36px */
--text-5xl: 3rem;      /* 48px */

/* Line Heights */
--leading-tight: 1.25;
--leading-normal: 1.5;
--leading-relaxed: 1.75;

/* Letter Spacing */
--tracking-tight: -0.025em;
--tracking-normal: 0;
--tracking-wide: 0.025em;
--tracking-wider: 0.05em;
```

### 4. Premium Component Styles

#### Card Component
```css
.premium-card {
  background: var(--bg-primary);
  border: 1px solid var(--border-primary);
  border-radius: 16px;
  padding: 24px;
  box-shadow: var(--shadow-md);
  transition: all 300ms cubic-bezier(0.4, 0, 0.2, 1);
}

.premium-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-xl);
  border-color: var(--accent-primary);
}
```

#### Button Component
```css
.premium-button {
  background: linear-gradient(135deg, var(--accent-primary), var(--accent-secondary));
  color: var(--bg-primary);
  font-family: var(--font-body);
  font-weight: 600;
  padding: 12px 32px;
  border-radius: 12px;
  border: none;
  box-shadow: var(--shadow-md);
  transition: all 300ms ease;
  letter-spacing: var(--tracking-wide);
}

.premium-button:hover {
  transform: scale(1.05);
  box-shadow: var(--shadow-lg);
}
```

#### Header Component
```css
.premium-header {
  height: 80px;
  background: rgba(var(--bg-primary-rgb), 0.8);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--border-primary);
  position: sticky;
  top: 0;
  z-index: 50;
  transition: all 300ms ease;
}

.premium-header.scrolled {
  height: 64px;
  box-shadow: var(--shadow-lg);
}
```

### 5. Glassmorphism Effects

```css
.glass-effect {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.1);
}

.glass-effect-dark {
  background: rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.3);
}
```

## Data Models

### Theme Settings (Database)

```typescript
interface ThemeSettings {
  default_theme: 'light' | 'dark' | 'system';
  allow_theme_toggle: boolean;
  accent_color_light: string;
  accent_color_dark: string;
  custom_font_display?: string;
  custom_font_body?: string;
}
```

## Layout Structure

### Page Layout
```
┌─────────────────────────────────────────┐
│         Premium Header (80px)           │
│  Logo | Nav | Theme Toggle | Profile    │
├─────────────────────────────────────────┤
│                                         │
│         Hero Section (400px)            │
│    Gradient Overlay + Glassmorphism     │
│                                         │
├─────────────────────────────────────────┤
│                                         │
│         Content Area                    │
│    Max-width: 1400px                    │
│    Padding: 48px                        │
│                                         │
│    ┌──────┐ ┌──────┐ ┌──────┐         │
│    │ Card │ │ Card │ │ Card │         │
│    └──────┘ └──────┘ └──────┘         │
│                                         │
├─────────────────────────────────────────┤
│         Premium Footer                  │
│    Links | Social | Contact             │
└─────────────────────────────────────────┘
```

## Error Handling

1. Theme não carrega: Fallback para tema claro
2. Fontes não carregam: Fallback para system fonts
3. CSS variables não suportadas: Fallback para cores fixas

## Testing Strategy

1. Testar alternância de tema em todos os componentes
2. Verificar contraste WCAG AA em ambos os temas
3. Testar performance de animações (60fps)
4. Validar responsividade em todos os breakpoints
5. Testar persistência de tema no localStorage
6. Verificar compatibilidade cross-browser

## Performance Considerations

1. Lazy load de fontes premium
2. CSS variables para mudança instantânea de tema
3. Transições GPU-accelerated (transform, opacity)
4. Debounce em scroll listeners
5. Memoização de componentes pesados

## Accessibility

1. Manter contraste WCAG AA mínimo
2. Respeitar prefers-reduced-motion
3. Keyboard navigation em todos os elementos
4. ARIA labels em botões de tema
5. Focus indicators visíveis em ambos os temas
