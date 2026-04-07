# Design Document - Redesign do Cardápio Online

## Overview

Este documento descreve o design técnico para o redesign completo do cardápio online do C&R Sushi. O objetivo é criar uma interface minimalista, moderna e responsiva utilizando uma paleta de cores limitada a vermelho, preto e branco, mantendo a funcionalidade existente enquanto melhora significativamente a experiência visual e de usabilidade.

O redesign será implementado como uma refatoração incremental dos componentes existentes (`Menu.tsx`, `ProductCard.tsx`, `HighlightCard.tsx`) e dos estilos globais (`index.css`), garantindo compatibilidade com a arquitetura atual baseada em React + TypeScript + Tailwind CSS + Supabase.

## Architecture

### Component Structure

O sistema de menu atual será mantido com melhorias incrementais:

```
Menu (Container)
├── Hero Section (Refatorado)
│   ├── Background Image (Otimizado)
│   ├── Overlay (Simplificado)
│   ├── Title & Subtitle (Estilizado)
│   └── Store Status Badge (Reposicionado)
├── Pre-order Banner (Mantido)
├── Search & Filters (Redesenhado)
│   ├── Search Input (Estilizado)
│   └── Category Tabs (Simplificado)
├── Highlights Section (Opcional, Redesenhado)
├── Products Grid (Refatorado)
│   ├── Promotions Grid (3 colunas desktop)
│   └── Regular Products Grid (4-5 colunas desktop)
└── Product Detail Modal (Mantido)
```

### Design System Tokens

**Color Palette:**
```typescript
const colors = {
  primary: {
    red: '#DC2626',      // Tailwind red-600
    redHover: '#B91C1C', // Tailwind red-700
    redLight: '#FEE2E2', // Tailwind red-50
  },
  neutral: {
    black: '#000000',
    darkGray: '#1F2937',  // Tailwind gray-800
    gray: '#6B7280',      // Tailwind gray-500
    lightGray: '#F3F4F6', // Tailwind gray-100
    white: '#FFFFFF',
  }
};
```

**Spacing Scale:**
```typescript
const spacing = {
  xs: '4px',
  sm: '8px',
  md: '16px',
  lg: '24px',
  xl: '32px',
  xxl: '48px',
};
```

**Typography Scale:**
```typescript
const typography = {
  heading: {
    size: '1.5rem',      // 24px
    weight: '700',
    lineHeight: '1.2',
  },
  body: {
    size: '1rem',        // 16px
    weight: '400',
    lineHeight: '1.5',
  },
  small: {
    size: '0.875rem',    // 14px
    weight: '400',
    lineHeight: '1.5',
  },
};
```

## Components and Interfaces

### 1. Hero Section Redesign

**Current State:**
- Altura fixa de 192px (h-48)
- Gradiente vermelho com imagem de fundo
- Título e subtítulo customizáveis
- Badge de status da loja posicionado absolutamente

**Design Changes:**

```typescript
interface HeroSectionProps {
  imageUrl: string;
  title: string;
  subtitle: string;
  isStoreOpen: boolean;
  isFestiveMode?: boolean; // Mantido para compatibilidade
}
```

**Visual Design:**
- Altura responsiva: 250px mobile, 350px desktop (reduzido de 400px)
- Overlay escuro simplificado: `bg-black/40` (opacidade reduzida)
- Remoção de gradientes complexos
- Imagens otimizadas com lazy loading
- Badge de status redesenhado com estilo minimalista

**Rationale:** A redução da altura do hero permite que os usuários vejam os produtos mais rapidamente, especialmente em dispositivos móveis. O overlay mais sutil mantém o foco no conteúdo.

### 2. Product Card Redesign

**Current State:**
- Layout horizontal com imagem à esquerda
- Informações do produto à direita
- Botão de adicionar no canto inferior direito
- Efeito de zoom na imagem ao hover (desktop)

**Design Changes:**

```typescript
interface ProductCardProps {
  product: Product;
  onProductClick: (product: Product) => void;
  isPromotion?: boolean;
  isMercadoPagoReturnFlow: boolean;
}
```

**Visual Design:**
- Aspect ratio da imagem: 1:1 (quadrado) para consistência
- Sombras sutis: `shadow-sm` base, `shadow-md` ao hover
- Border radius: `rounded-lg` (8px)
- Padding interno consistente: 12px (p-3)
- Hover effect simplificado: elevação suave sem zoom excessivo
- Cores:
  - Background: `bg-white` (produtos regulares), `bg-red-50` (promoções)
  - Border: `border-gray-200` (regulares), `border-red-300` (promoções)
  - Preço: `text-red-600` com `font-bold`
  - Botão: `bg-red-600 hover:bg-red-700`

**Layout Structure:**
```
┌─────────────────────┐
│  [Image 1:1]        │
├─────────────────────┤
│ Product Name        │
│ Description (2 lin) │
│                     │
│ R$ 00.00    [+]     │
└─────────────────────┘
```

**Rationale:** O layout vertical com imagem no topo é mais moderno e funciona melhor em grids responsivos. O aspect ratio 1:1 garante consistência visual e facilita o gerenciamento de imagens.

### 3. Category Filter Redesign

**Current State:**
- Scroll horizontal com múltiplos estilos de botões
- Categoria "Ovos de Sushi" com animação pulsante
- Categoria "Todos" com estilo diferenciado
- Modo festivo com gradientes

**Design Changes:**

**Visual Design:**
- Estilo unificado para todas as categorias (exceto "Ovos de Sushi" que mantém destaque)
- Botões pill-shaped: `rounded-full`
- Estado ativo: `bg-red-600 text-white`
- Estado inativo: `bg-gray-100 text-gray-700 hover:bg-gray-200`
- Transições suaves: `transition-all duration-300`
- Remoção de gradientes festivos complexos (simplificação)

**Rationale:** A simplificação dos estilos de categoria melhora a consistência visual e reduz a complexidade cognitiva. O destaque especial para "Ovos de Sushi" é mantido por ser uma categoria promocional importante.

### 4. Search Input Redesign

**Current State:**
- Input com ícone de busca
- Border padrão com focus ring vermelho

**Design Changes:**

**Visual Design:**
- Border mais sutil: `border-gray-200`
- Focus ring simplificado: `focus:ring-2 focus:ring-red-500 focus:border-red-500`
- Placeholder text: `text-gray-400`
- Padding interno: `py-3 px-4` (aumentado para melhor touch target)
- Border radius: `rounded-lg`

**Rationale:** O aumento do padding melhora a usabilidade em dispositivos móveis, atendendo ao requisito de touch targets de 44x44px.

### 5. Grid Layout Optimization

**Current State:**
- Promoções: 3 colunas no desktop
- Produtos regulares: 5 colunas no desktop
- 1 coluna no mobile

**Design Changes:**

**Responsive Breakpoints:**
```css
/* Mobile: < 640px */
grid-cols-1

/* Tablet: 640px - 1024px */
grid-cols-2 (promoções)
grid-cols-3 (produtos regulares)

/* Desktop: > 1024px */
grid-cols-3 (promoções)
grid-cols-4 (produtos regulares - reduzido de 5)
```

**Gap Spacing:**
- Mobile: `gap-4` (16px)
- Desktop: `gap-6` (24px)

**Rationale:** A redução de 5 para 4 colunas no desktop melhora a legibilidade dos cards e permite imagens maiores. O grid de 4 colunas é mais equilibrado visualmente.

## Data Models

Nenhuma alteração nos modelos de dados é necessária. Os tipos existentes serão mantidos:

```typescript
interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  original_price?: number;
  promotional_price_single?: number;
  image: string;
  category: string;
  available: boolean;
  badge_text?: string;
}

interface Highlight {
  id: string;
  name: string;
  price: number;
  image_url: string;
  border_color: string;
  shadow_size: string;
  order_index: number;
}
```

## Styling Implementation

### Global CSS Updates (index.css)

**Removals:**
- Animações festivas complexas (blink, swing)
- Gradientes festivos
- Animações de neve (snowfall)

**Additions:**
```css
/* Smooth hover transitions */
.card-hover {
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.card-hover:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}

/* Skeleton loader */
.skeleton {
  background: linear-gradient(
    90deg,
    #f3f4f6 25%,
    #e5e7eb 50%,
    #f3f4f6 75%
  );
  background-size: 200% 100%;
  animation: loading 1.5s infinite;
}

@keyframes loading {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
```

**Rationale:** A remoção de animações complexas melhora a performance e alinha com o design minimalista. Os skeleton loaders melhoram a percepção de velocidade durante o carregamento.

### Tailwind Configuration

Nenhuma alteração necessária no `tailwind.config.js`. As cores padrão do Tailwind (red-600, gray-100, etc.) já atendem aos requisitos.

## Performance Optimization

### Image Optimization Strategy

**Implementation:**
1. Lazy loading nativo: `loading="lazy"` em todas as imagens de produtos
2. Aspect ratio boxes para prevenir layout shift
3. Placeholder blur durante carregamento (skeleton)
4. Responsive images com srcset (futuro)

```typescript
<img
  src={product.image}
  alt={product.name}
  loading="lazy"
  className="w-full aspect-square object-cover rounded-t-lg"
/>
```

### Skeleton Loaders

**Implementation:**
```typescript
const ProductCardSkeleton = () => (
  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3">
    <div className="skeleton aspect-square rounded-lg mb-3" />
    <div className="skeleton h-4 w-3/4 mb-2 rounded" />
    <div className="skeleton h-3 w-full mb-1 rounded" />
    <div className="skeleton h-3 w-2/3 rounded" />
  </div>
);
```

**Rationale:** Skeleton loaders fornecem feedback visual imediato e melhoram a percepção de performance, atendendo ao requisito de First Contentful Paint < 2s.

## Accessibility

### Keyboard Navigation

**Implementation:**
- Todos os botões e links mantêm `tabindex` natural
- Focus indicators visíveis: `focus:ring-2 focus:ring-red-500 focus:ring-offset-2`
- Skip links para navegação rápida (futuro)

### ARIA Labels

**Implementation:**
```typescript
<button
  aria-label={`Adicionar ${product.name} ao carrinho`}
  onClick={() => onProductClick(product)}
>
  <Plus className="h-5 w-5" />
</button>

<div role="status" aria-live="polite">
  {loading ? 'Carregando produtos...' : `${products.length} produtos encontrados`}
</div>
```

### Color Contrast

**WCAG AA Compliance:**
- Texto preto (#000000) em fundo branco: 21:1 (AAA)
- Texto branco em vermelho (#DC2626): 5.5:1 (AA)
- Texto cinza (#6B7280) em fundo branco: 4.6:1 (AA)

**Rationale:** Todos os pares de cores atendem ou excedem os requisitos WCAG AA, garantindo legibilidade para usuários com deficiências visuais.

## Error Handling

Nenhuma alteração na lógica de error handling. Mantém-se:
- Toast notifications para erros de carregamento
- Estados de loading com skeleton loaders
- Mensagens de "nenhum produto encontrado"

## Testing Strategy

### Visual Regression Testing

**Manual Testing Checklist:**
1. Verificar layout em 3 breakpoints: 375px (mobile), 768px (tablet), 1440px (desktop)
2. Testar hover states em todos os elementos interativos
3. Validar contrast ratios com ferramentas de acessibilidade
4. Testar navegação por teclado
5. Verificar performance com Lighthouse (target: > 90)

### Responsive Testing

**Devices to Test:**
- iPhone SE (375px)
- iPhone 12 Pro (390px)
- iPad (768px)
- Desktop (1440px)

### Accessibility Testing

**Tools:**
- axe DevTools para validação WCAG
- Keyboard navigation manual testing
- Screen reader testing (NVDA/JAWS)

## Migration Strategy

### Phase 1: Global Styles
- Atualizar `index.css` com novos estilos
- Remover animações festivas complexas
- Adicionar skeleton loaders

### Phase 2: Hero Section
- Refatorar altura e overlay
- Otimizar imagens
- Simplificar estilos

### Phase 3: Product Cards
- Implementar novo layout vertical
- Atualizar aspect ratios
- Adicionar skeleton loaders

### Phase 4: Category Filters
- Simplificar estilos de botões
- Unificar estados ativos/inativos
- Melhorar touch targets

### Phase 5: Grid Layout
- Ajustar breakpoints
- Otimizar número de colunas
- Testar responsividade

### Phase 6: Polish & Testing
- Validar acessibilidade
- Testar performance
- Ajustes finais

## Design Decisions & Rationales

### 1. Paleta de Cores Limitada
**Decision:** Usar apenas vermelho (#DC2626), preto (#000000/#1F2937) e branco (#FFFFFF/#F3F4F6)

**Rationale:** A paleta limitada cria uma identidade visual forte e minimalista, reduz a complexidade cognitiva e melhora a consistência. O vermelho como cor de destaque alinha com a identidade da marca e cria urgência/apetite.

### 2. Layout Vertical dos Cards
**Decision:** Mudar de layout horizontal para vertical com imagem no topo

**Rationale:** O layout vertical é mais moderno, funciona melhor em grids responsivos e permite imagens maiores. O aspect ratio 1:1 garante consistência visual independente da qualidade das imagens fornecidas.

### 3. Redução de Colunas no Desktop
**Decision:** Reduzir de 5 para 4 colunas no grid de produtos regulares

**Rationale:** 4 colunas proporcionam melhor legibilidade, permitem cards maiores e criam um layout mais equilibrado. 5 colunas resultavam em cards muito pequenos e difíceis de ler.

### 4. Simplificação do Hero
**Decision:** Reduzir altura e simplificar overlay

**Rationale:** Um hero menor permite que os usuários vejam os produtos mais rapidamente, especialmente em mobile. O overlay mais sutil mantém o foco no conteúdo sem comprometer a legibilidade.

### 5. Skeleton Loaders
**Decision:** Implementar skeleton loaders em vez de spinners

**Rationale:** Skeleton loaders fornecem uma prévia da estrutura do conteúdo, melhoram a percepção de performance e reduzem a ansiedade do usuário durante o carregamento.

### 6. Manutenção de Funcionalidades Existentes
**Decision:** Manter todas as funcionalidades atuais (modo festivo, ovos de sushi, etc.)

**Rationale:** O redesign foca em melhorias visuais e de UX sem remover funcionalidades que podem ser importantes para o negócio. Funcionalidades podem ser simplificadas mas não removidas.

### 7. Mobile-First Approach
**Decision:** Priorizar o design mobile e expandir para desktop

**Rationale:** A maioria dos usuários de delivery acessa via mobile. Um design mobile-first garante uma experiência otimizada para a maioria dos usuários e facilita a adaptação para telas maiores.

## Technical Constraints

1. **Framework:** React 18 + TypeScript - mantido
2. **Styling:** Tailwind CSS - mantido
3. **Backend:** Supabase - sem alterações
4. **Build Tool:** Vite - mantido
5. **Browser Support:** Últimas 2 versões de Chrome, Firefox, Safari, Edge

## Future Enhancements

1. **WebP Images:** Implementar formato WebP com fallback para PNG/JPG
2. **Infinite Scroll:** Substituir paginação por infinite scroll
3. **Advanced Filters:** Adicionar filtros por preço, popularidade, etc.
4. **Dark Mode:** Implementar tema escuro (preto/vermelho/cinza escuro)
5. **Animations:** Adicionar micro-interações sutis com Framer Motion
6. **PWA:** Transformar em Progressive Web App para instalação

## Conclusion

Este design mantém a arquitetura e funcionalidades existentes enquanto moderniza significativamente a interface visual. A abordagem incremental permite implementação gradual com testes contínuos, minimizando riscos. O foco em minimalismo, performance e acessibilidade garante uma experiência superior para todos os usuários.
