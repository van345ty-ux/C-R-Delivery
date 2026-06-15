# Pontos de Atenção (Dívida Técnica / Oportunidades de Melhoria)

- **Sobrecarga no `App.tsx`:** O arquivo `App.tsx` está muito grande (mais de 750 linhas) e acumula muitas responsabilidades (estado global de autenticação, carrinho, requisições iniciais de API, lógica de horário comercial, lógica de cupons e roteamento). 
  - **Recomendação:** Migrar o roteamento para o `react-router-dom` verdadeiro e extrair lógicas de contexto (ex: `CartContext`, `AuthContext`) para limpar o componente principal.
- **Requisições de API Mistas:** O projeto mistura chamadas usando o SDK do Supabase (`supabase.from(...)`) com chamadas `fetch` manuais para a REST API do Supabase (para `profiles`, `settings`, `cities`, `operating_hours`). 
  - **Recomendação:** Centralizar essas requisições em hooks personalizados (ex: `useFetchCities`) para tornar o código mais limpo e padronizado.
- **Uso Extensivo de LocalStorage:** Muitos estados são sincronizados em tempo real com o `localStorage` (carrinho, fluxos de retorno do pix, cidade selecionada, etc.). Isso funciona bem, mas poderia ser encapsulado em um hook `useLocalStorage` para evitar a repetição da verificação `typeof window !== 'undefined'` por todo o código.
