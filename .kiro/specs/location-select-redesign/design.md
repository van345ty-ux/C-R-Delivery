# Design Document - Location Select Redesign

## Overview

Este documento descreve o design técnico para o redesign do componente LocationSelect, transformando-o em uma interface premium com temática japonesa. O design segue o mockup de referência fornecido, incorporando elementos visuais como padrão de ondas japonesas (seigaiha), elementos decorativos (flores de cerejeira e bambu), e uma paleta de cores escura e elegante.

## Architecture

### Component Structure

O LocationSelect manterá sua estrutura React existente, mas com modificações significativas no JSX e estilos:

```
LocationSelect
├── Background Layer (padrão de ondas)
├── Main Card Container
│   ├── Logo Section
│   ├── Title Section (C&R SUSHI)
│   ├── Subtitle Section (Sabores autênticos do Japão)
│   ├── City Selection Section
│   │   ├── Active City Buttons
│   │   └── Inactive City Buttons
│   └── Decorative Elements
│       ├── Cherry Blossom (bottom-left)
│       └── Bamboo Leaves (bottom-right)
└── Alert Modal (mantém funcionalidade existente)
```

### Visual Design System

O design utiliza o sistema de temas existente mas adiciona novos elementos visuais:

1. **Background Pattern**: Padrão seigaiha (ondas japonesas) aplicado via CSS
2. **Color Palette**: 
   - Primary Red: `#C41E3A` (ou `var(--accent-primary)`)
   - Dark Background: `#0A0A0A` to `#1A1A1A`
   - Light Text: `#FFFFFF` e `#D4D4D4`
3. **Typography**: Mantém Playfair Display para títulos e Inter para corpo

## Components and Interfaces

### LocationSelect Component

**Props** (mantém interface existente):
```typescript
interface LocationSelectProps {
  cities: City[];
  onCitySelect: (cityName: string) => void;
  logoUrl: string;
}
```

**New Internal Structure**:

1. **Background Layer**
   - Implementado via CSS com pseudo-elemento `::before`
   - Padrão SVG de ondas japonesas
   - Opacidade reduzida para não competir com conteúdo

2. **Main Card**
   - Background: `rgba(26, 26, 26, 0.95)` (dark semi-transparent)
   - Border radius: `rounded-3xl` (1.5rem)
   - Padding: aumentado para acomodar elementos decorativos
   - Box shadow: `var(--shadow-2xl)`

3. **Logo Section**
   - Tamanho aumentado: `w-32 h-32` (128px)
   - Sombra circular mais pronunciada
   - Mantém hover effect

4. **Title Section**
   - "C&R SUSHI" em vermelho: `color: #C41E3A`
   - Font size: `text-4xl` ou maior
   - Font weight: `bold` (700)
   - Font family: `var(--font-display)`

5. **Subtitle Section**
   - "Sabores autênticos do Japão"
   - Color: `var(--text-secondary)` (cinza claro)
   - Font size: `text-base` ou `text-lg`

6. **City Buttons**

   **Active City Button**:
   ```css
   background: #C41E3A (solid red)
   color: #FFFFFF
   border: none
   border-radius: rounded-xl
   padding: py-4 px-6
   icon: MapPin (white)
   hover: scale-105, brightness increase
   ```

   **Inactive City Button**:
   ```css
   background: rgba(42, 42, 42, 0.5) (dark transparent)
   color: #A3A3A3 (gray)
   border: 1px solid rgba(255, 255, 255, 0.1)
   border-radius: rounded-xl
   padding: py-4 px-6
   icon: AlertTriangle (gray)
   cursor: not-allowed
   opacity: 0.6
   ```

7. **Decorative Elements**

   **Cherry Blossom (bottom-left)**:
   - SVG ou emoji: 🌸
   - Position: `absolute bottom-4 left-4`
   - Size: `text-4xl` ou `w-12 h-12`
   - Opacity: `0.3` to `0.5`
   - Color: light pink/white

   **Bamboo Leaves (bottom-right)**:
   - SVG ou emoji: 🎋
   - Position: `absolute bottom-4 right-4`
   - Size: `text-4xl` ou `w-12 h-12`
   - Opacity: `0.3` to `0.5`
   - Color: dark green

## Data Models

Não há mudanças nos modelos de dados. O componente continua usando:

```typescript
interface City {
  name: string;
  active: boolean;
}
```

## CSS Implementation

### Background Pattern (Seigaiha Waves)

Implementação via CSS com SVG inline:

```css
.location-select-container::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-image: url("data:image/svg+xml,..."); /* SVG pattern */
  opacity: 0.1;
  z-index: 0;
}
```

### Card Styling

```css
.location-card {
  position: relative;
  background: rgba(26, 26, 26, 0.95);
  border-radius: 1.5rem;
  padding: 2.5rem;
  box-shadow: var(--shadow-2xl);
  backdrop-filter: blur(10px);
}
```

### Button Variants

```css
/* Active City Button */
.city-button-active {
  background: linear-gradient(135deg, #C41E3A 0%, #A01828 100%);
  color: #FFFFFF;
  border: none;
  border-radius: 0.75rem;
  padding: 1rem 1.5rem;
  font-weight: 600;
  transition: all 0.3s ease;
}

.city-button-active:hover {
  transform: scale(1.05);
  box-shadow: 0 8px 16px rgba(196, 30, 58, 0.4);
}

/* Inactive City Button */
.city-button-inactive {
  background: rgba(42, 42, 42, 0.5);
  color: #A3A3A3;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 0.75rem;
  padding: 1rem 1.5rem;
  font-weight: 600;
  cursor: not-allowed;
  opacity: 0.6;
}
```

## Error Handling

Mantém o sistema de alerta existente para cidades inativas:

1. Usuário clica em cidade inativa
2. Modal de alerta aparece com mensagem
3. Modal fecha automaticamente após 3 segundos ou ao clicar fora
4. Funcionalidade permanece inalterada

## Testing Strategy

### Visual Testing

1. **Responsiveness**
   - Testar em mobile (320px - 480px)
   - Testar em tablet (768px - 1024px)
   - Testar em desktop (1280px+)
   - Verificar que elementos decorativos não quebram layout

2. **Theme Compatibility**
   - Verificar que design funciona em tema dark (principal)
   - Verificar que design funciona em tema light (se aplicável)
   - Testar transições de tema

3. **Browser Compatibility**
   - Chrome/Edge (Chromium)
   - Firefox
   - Safari
   - Verificar backdrop-filter support

### Functional Testing

1. **City Selection**
   - Clicar em cidade ativa deve chamar `onCitySelect`
   - Clicar em cidade inativa deve mostrar alerta
   - Alerta deve fechar após 3 segundos
   - Alerta deve fechar ao clicar fora

2. **Accessibility**
   - Verificar contraste de cores (WCAG AA)
   - Testar navegação por teclado
   - Verificar que ícones têm labels apropriados
   - Testar com screen readers

### Performance Testing

1. Verificar que padrão de fundo não impacta performance
2. Verificar que animações são suaves (60fps)
3. Testar com múltiplas cidades (5+)

## Implementation Notes

### SVG Pattern for Seigaiha

O padrão de ondas japonesas será implementado como SVG inline no CSS:

```svg
<svg width="100" height="100" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <pattern id="seigaiha" x="0" y="0" width="100" height="100" patternUnits="userSpaceOnUse">
      <!-- Wave pattern paths -->
    </pattern>
  </defs>
</svg>
```

### Decorative Elements Options

Duas abordagens possíveis:

1. **Emoji/Unicode**: Simples, mas menos controle visual
   - Cherry Blossom: 🌸
   - Bamboo: 🎋

2. **SVG Icons**: Mais controle, melhor qualidade
   - Usar biblioteca como lucide-react ou custom SVG
   - Permite ajuste fino de cor e opacidade

Recomendação: Usar SVG para melhor controle visual

### Responsive Breakpoints

```css
/* Mobile */
@media (max-width: 640px) {
  - Logo: w-24 h-24
  - Title: text-3xl
  - Padding: p-6
  - Decorative elements: smaller or hidden
}

/* Tablet */
@media (min-width: 641px) and (max-width: 1024px) {
  - Logo: w-28 h-28
  - Title: text-4xl
  - Padding: p-8
}

/* Desktop */
@media (min-width: 1025px) {
  - Logo: w-32 h-32
  - Title: text-5xl
  - Padding: p-10
}
```

## Migration Strategy

1. Criar novo branch para desenvolvimento
2. Implementar mudanças visuais mantendo funcionalidade
3. Testar em ambiente de desenvolvimento
4. Validar com stakeholders
5. Deploy gradual (feature flag se necessário)

## Dependencies

Nenhuma nova dependência necessária. O projeto já possui:
- React
- Tailwind CSS
- lucide-react (para ícones)
- Sistema de temas existente

## Accessibility Considerations

1. **Color Contrast**
   - Vermelho (#C41E3A) em fundo escuro: ratio > 4.5:1 ✓
   - Branco em vermelho: ratio > 4.5:1 ✓
   - Cinza em fundo escuro: verificar ratio

2. **Keyboard Navigation**
   - Todos os botões devem ser focáveis
   - Ordem de foco lógica (logo → título → botões)
   - Indicador de foco visível

3. **Screen Readers**
   - Logo deve ter alt text apropriado
   - Botões devem ter labels descritivos
   - Elementos decorativos devem ter `aria-hidden="true"`

4. **Motion**
   - Respeitar `prefers-reduced-motion`
   - Animações devem ser opcionais
