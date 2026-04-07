# Requirements Document

## Introduction

Este documento especifica os requisitos para remover a funcionalidade de auto-recarregamento da página do aplicativo web. Atualmente, o aplicativo força um recarregamento completo sempre que o usuário retorna à aba (quando a aba fica visível) ou quando a página é restaurada do cache do navegador. Esta funcionalidade será removida para melhorar a experiência do usuário, permitindo que ele continue de onde parou sem perder o estado da aplicação.

## Glossary

- **App**: O componente principal da aplicação React localizado em `src/App.tsx`
- **Auto-reload**: Funcionalidade que força o recarregamento completo da página através de `window.location.reload()`
- **visibilitychange**: Evento do navegador disparado quando a aba muda de visibilidade (fica visível ou oculta)
- **pageshow**: Evento do navegador disparado quando a página é exibida, incluindo quando restaurada do cache (BFCache)
- **BFCache**: Back/Forward Cache - cache do navegador que armazena páginas para navegação rápida

## Requirements

### Requirement 1

**User Story:** Como um usuário do aplicativo web, eu quero que a página mantenha seu estado quando eu volto para a aba, para que eu possa continuar de onde parei sem perder meu progresso.

#### Acceptance Criteria

1. WHEN o usuário muda para outra aba e depois retorna, THE App SHALL manter o estado atual sem recarregar a página
2. WHEN a página é restaurada do BFCache do navegador, THE App SHALL manter o estado atual sem recarregar a página
3. THE App SHALL remover os event listeners de `visibilitychange` e `pageshow` que forçam o recarregamento
4. THE App SHALL remover a chamada `window.location.reload()` dos handlers de eventos de visibilidade

### Requirement 2

**User Story:** Como desenvolvedor, eu quero remover código desnecessário relacionado ao auto-recarregamento, para que o código fique mais limpo e manutenível.

#### Acceptance Criteria

1. THE App SHALL remover o useEffect que adiciona listeners para `visibilitychange` e `pageshow`
2. THE App SHALL remover as funções `handleVisibilityChange` e `handlePageShow`
3. THE App SHALL remover comentários relacionados à lógica de recarregamento forçado
4. THE App SHALL manter a funcionalidade de atualização do timestamp de último acesso (LAST_ACCESS_KEY)
