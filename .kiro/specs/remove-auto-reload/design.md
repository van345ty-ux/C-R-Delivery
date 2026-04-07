# Design Document

## Overview

Este documento descreve o design para remover a funcionalidade de auto-recarregamento da página do aplicativo web. A solução envolve a remoção de um `useEffect` específico e seus handlers associados no componente `App.tsx`, mantendo apenas a funcionalidade de atualização do timestamp de último acesso.

## Architecture

A mudança será feita exclusivamente no componente principal `App` (`src/App.tsx`). Não há impacto em outros componentes ou módulos da aplicação.

### Componentes Afetados

- **src/App.tsx**: Componente principal onde a lógica de auto-recarregamento está implementada

## Components and Interfaces

### App Component (src/App.tsx)

**Mudanças necessárias:**

1. **Remover o useEffect de auto-recarregamento**: Localizado aproximadamente nas linhas que contêm:
   - `const handleVisibilityChange`
   - `const handlePageShow`
   - `document.addEventListener('visibilitychange', handleVisibilityChange)`
   - `window.addEventListener('pageshow', handlePageShow)`
   - `window.location.reload()`

2. **Manter funcionalidade existente**: O código que atualiza o timestamp de último acesso deve ser preservado:
   ```typescript
   if (typeof window !== 'undefined' && !isLoading) {
     localStorage.setItem(LAST_ACCESS_KEY, Date.now().toString());
     console.log('App: Updated last access timestamp.');
   }
   ```

## Data Models

Não há mudanças nos modelos de dados. A constante `LAST_ACCESS_KEY` e seu uso no localStorage serão mantidos.

## Implementation Details

### Código a ser removido

O seguinte bloco de código será removido do `useEffect`:

```typescript
// Lógica para forçar o recarregamento sempre que a aba ficar visível
const handleVisibilityChange = () => {
  if (document.visibilityState === 'visible') {
    console.log('App: Tab became visible. Forcing reload.');
    window.location.reload();
  }
};

const handlePageShow = (event: PageTransitionEvent) => {
  if (event.persisted) {
    console.log('App: Page restored from BFCache/Suspension. Forcing reload.');
    window.location.reload();
  }
};

document.addEventListener('visibilitychange', handleVisibilityChange);
window.addEventListener('pageshow', handlePageShow);

return () => {
  document.removeEventListener('visibilitychange', handleVisibilityChange);
  window.removeEventListener('pageshow', handlePageShow);
};
```

### Código a ser mantido

O `useEffect` será simplificado para manter apenas a atualização do timestamp:

```typescript
useEffect(() => {
  // Atualiza o timestamp sempre que o app estiver ativo e não carregando
  if (typeof window !== 'undefined' && !isLoading) {
    localStorage.setItem(LAST_ACCESS_KEY, Date.now().toString());
    console.log('App: Updated last access timestamp.');
  }
}, [isLoading]);
```

### Comentários a serem atualizados

O comentário "EFEITO REFORÇADO" será atualizado para refletir que apenas o timestamp é atualizado, sem recarregamento forçado.

## Error Handling

Não há tratamento de erros adicional necessário, pois estamos removendo funcionalidade ao invés de adicionar. A aplicação continuará funcionando normalmente com o gerenciamento de estado do React.

## Testing Strategy

### Testes Manuais

1. **Teste de mudança de aba:**
   - Abrir o aplicativo
   - Navegar para outra aba
   - Retornar à aba do aplicativo
   - Verificar que a página não recarrega e o estado é mantido

2. **Teste de navegação back/forward:**
   - Navegar para outra página
   - Usar o botão "voltar" do navegador
   - Verificar que a página não recarrega e o estado é mantido

3. **Teste de timestamp:**
   - Verificar no localStorage que o `lastAccessTimestamp` ainda é atualizado corretamente
   - Confirmar através do console log

### Validação

- Verificar que não há erros no console do navegador
- Confirmar que o carrinho de compras, cidade selecionada e outros estados persistem ao mudar de aba
- Validar que a experiência do usuário é fluida sem recarregamentos inesperados
