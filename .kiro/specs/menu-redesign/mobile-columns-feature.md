# Funcionalidade: Controle de Colunas do Cardápio Mobile

## Visão Geral
Nova funcionalidade que permite ao administrador controlar quantas colunas de produtos são exibidas no cardápio em dispositivos móveis (telas menores que 640px).

## Localização
**Painel Admin → Configurações → Layout do Cardápio Mobile**

## Opções Disponíveis

### 1 Coluna (Padrão)
- **Ícone:** 📱
- **Descrição:** Cards maiores, mais detalhes
- **Layout Visual:**
  - Padding: 16px (p-4)
  - Título: text-base (16px)
  - Descrição: Visível, 2 linhas
  - Preço: text-base (16px)
  - Botão: 44x44px
- **Comportamento:** 
  - Mobile (< 640px): 1 coluna
  - Tablet (640px-1024px): 2-3 colunas (automático)
  - Desktop (> 1024px): 3-4 colunas (automático)
- **Vantagens:**
  - Cards maiores e mais legíveis
  - Mais espaço para descrições
  - Melhor para produtos com muitos detalhes
  - Scroll vertical mais longo

### 2 Colunas
- **Ícone:** 📱📱
- **Descrição:** Mais produtos visíveis
- **Layout Visual (Modo Compacto):**
  - Padding: 8px (p-2) - **Reduzido**
  - Título: text-sm (14px), 2 linhas - **Menor**
  - Descrição: Oculta - **Economiza espaço**
  - Preço: text-sm (14px) - **Menor**
  - Botão: 36x36px - **Menor**
  - Badge: text-xs - **Menor**
- **Comportamento:**
  - Mobile (< 640px): 2 colunas compactas
  - Tablet (640px-1024px): 2-3 colunas (automático, layout normal)
  - Desktop (> 1024px): 3-4 colunas (automático, layout normal)
- **Vantagens:**
  - Mais produtos visíveis sem scroll
  - Melhor aproveitamento do espaço horizontal
  - Navegação mais rápida
  - Cards menores mas ainda legíveis
  - Layout otimizado para mobile

## Implementação Técnica

### Arquivos Modificados

1. **src/components/admin/AdminSettings.tsx**
   - Adicionada nova seção "Layout do Cardápio Mobile"
   - Botões toggle para alternar entre 1 e 2 colunas
   - Configuração salva em `settings.menu_mobile_columns`

2. **src/App.tsx**
   - Busca configuração `menu_mobile_columns` do banco
   - Passa para HomePage via props
   - Valor padrão: '1'

3. **src/components/HomePage.tsx**
   - Recebe prop `menuMobileColumns`
   - Passa para componente Menu

4. **src/components/Menu.tsx**
   - Recebe prop `menuMobileColumns`
   - Aplica classe CSS dinâmica nos grids:
     - `grid-cols-1` quando `menuMobileColumns === '1'`
     - `grid-cols-2` quando `menuMobileColumns === '2'`
   - Passa prop `isCompactMode` para ProductCard quando em 2 colunas
   - Afeta tanto grid de promoções quanto grid de produtos regulares

5. **src/components/ProductCard.tsx** ⭐ **NOVO**
   - Adicionada prop `isCompactMode`
   - Layout responsivo baseado no modo:
     - **Modo Normal (1 coluna):**
       - Padding: p-4 (16px)
       - Título: text-base, mb-2
       - Descrição: Visível, line-clamp-2
       - Preço: text-base
       - Botão: 44x44px
     - **Modo Compacto (2 colunas):**
       - Padding: p-2 (8px)
       - Título: text-sm, line-clamp-2, mb-1
       - Descrição: Oculta (economiza espaço)
       - Preço: text-sm
       - Botão: 36x36px
       - Badge: text-xs, padding reduzido

### Classes CSS Aplicadas

#### Grid de Promoções
```tsx
<div className={`grid ${menuMobileColumns === '2' ? 'grid-cols-2' : 'grid-cols-1'} sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6`}>
```

#### Grid de Produtos Regulares
```tsx
<div className={`grid ${menuMobileColumns === '2' ? 'grid-cols-2' : 'grid-cols-1'} sm:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6`}>
```

### Breakpoints
- **Mobile (< 640px):** Controlado pela configuração (1 ou 2 colunas)
- **Tablet (640px-1024px):** 2-3 colunas (fixo)
- **Desktop (> 1024px):** 3-4 colunas (fixo)

## Banco de Dados

### Tabela: settings
Nova chave adicionada:
- **key:** `menu_mobile_columns`
- **value:** `'1'` ou `'2'`
- **default:** `'1'`

## Interface do Usuário

### Painel Admin
```
┌─────────────────────────────────────────────┐
│ Layout do Cardápio Mobile                   │
├─────────────────────────────────────────────┤
│ Número de Colunas no Mobile                 │
│                                             │
│ ┌──────────────┐  ┌──────────────┐        │
│ │      📱      │  │    📱📱      │        │
│ │  1 Coluna    │  │  2 Colunas   │        │
│ │ Cards maiores│  │ Mais produtos│        │
│ │ mais detalhes│  │   visíveis   │        │
│ └──────────────┘  └──────────────┘        │
│                                             │
│ Esta configuração afeta apenas dispositivos │
│ móveis (telas menores que 640px).          │
└─────────────────────────────────────────────┘
```

## Diferenças Visuais Detalhadas

### Comparação: 1 Coluna vs 2 Colunas

| Elemento | 1 Coluna | 2 Colunas (Compacto) |
|----------|----------|----------------------|
| **Padding do Card** | 16px (p-4) | 8px (p-2) |
| **Título** | 16px, 1 linha | 14px, 2 linhas |
| **Badge** | 14px, px-2 py-1 | 12px, px-1.5 py-0.5 |
| **Descrição** | Visível, 2 linhas | Oculta |
| **Preço** | 16px | 14px |
| **Preço Original** | 14px | 12px |
| **Botão +** | 44x44px | 36x36px |
| **Ícone +** | 20x20px | 16x16px |
| **Espaçamento Inferior** | mb-4 | mb-1/mb-2 |

### Exemplo Visual

```
┌─────────────────────────────────────┐
│         1 COLUNA (Padrão)           │
├─────────────────────────────────────┤
│ ┌─────────────────────────────────┐ │
│ │         [Imagem 1:1]            │ │
│ │                                 │ │
│ ├─────────────────────────────────┤ │
│ │ Sushi Premium (16px)            │ │
│ │ 🎌 Especial (14px)              │ │
│ │ Delicioso sushi com salmão      │ │
│ │ fresco e arroz especial (14px)  │ │
│ │                                 │ │
│ │ R$ 45.00 (16px)      [+ 44px]  │ │
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘

┌──────────────────┬──────────────────┐
│   2 COLUNAS      │   (Compacto)     │
├──────────────────┼──────────────────┤
│ ┌──────────────┐ │ ┌──────────────┐ │
│ │  [Img 1:1]   │ │ │  [Img 1:1]   │ │
│ ├──────────────┤ │ ├──────────────┤ │
│ │Sushi Premium │ │ │ Temaki de    │ │
│ │(14px, 2 lin) │ │ │ Salmão       │ │
│ │🎌 Esp (12px) │ │ │              │ │
│ │R$ 45 [+ 36px]│ │ │R$ 28 [+ 36px]│ │
│ └──────────────┘ │ └──────────────┘ │
└──────────────────┴──────────────────┘
```

## Casos de Uso

### Quando usar 1 Coluna
- Produtos com descrições longas
- Produtos com muitos detalhes importantes
- Foco em qualidade visual dos cards
- Público que prefere scroll vertical

### Quando usar 2 Colunas
- Cardápio com muitos produtos
- Produtos com nomes e descrições curtas
- Foco em mostrar variedade rapidamente
- Público que prefere ver mais opções de uma vez

## Testes Realizados

✅ Configuração salva corretamente no banco
✅ Valor padrão '1' aplicado quando não configurado
✅ Mudança reflete imediatamente no cardápio mobile
✅ Não afeta layout em tablet e desktop
✅ Ambas as opções (1 e 2 colunas) funcionam corretamente
✅ Cards mantêm proporções corretas em ambos os layouts
✅ Sem erros de diagnóstico TypeScript

## Compatibilidade

- ✅ Chrome (mobile e desktop)
- ✅ Firefox (mobile e desktop)
- ✅ Safari (iOS e macOS)
- ✅ Edge
- ✅ Todos os dispositivos móveis modernos

## Notas Importantes

1. A configuração afeta **apenas** telas menores que 640px (mobile)
2. Em tablets e desktops, o layout continua responsivo automaticamente
3. A mudança é aplicada globalmente para todos os usuários
4. Não requer reload da página - aplica na próxima navegação
5. Configuração persiste no banco de dados

## Próximos Passos Sugeridos

- [ ] Adicionar preview visual no painel admin
- [ ] Permitir configuração por categoria
- [ ] Adicionar opção de 3 colunas para tablets grandes
- [ ] Criar A/B test para medir qual layout converte mais
