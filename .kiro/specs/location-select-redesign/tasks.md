# Implementation Plan

- [x] 1. Criar padrão de fundo seigaiha (ondas japonesas)





  - Adicionar SVG pattern inline no CSS do index.css
  - Criar classe CSS `.seigaiha-pattern` com o padrão de ondas
  - Configurar opacidade e posicionamento do padrão
  - _Requirements: 1.1_

- [x] 2. Atualizar estrutura do card principal do LocationSelect





  - Modificar background do card para `rgba(26, 26, 26, 0.95)`
  - Aplicar padrão seigaiha ao container principal
  - Ajustar padding e border-radius conforme design
  - Adicionar backdrop-filter para efeito glass
  - _Requirements: 3.1, 3.2, 3.3_

- [x] 3. Redesenhar seção de logo e títulos





  - Aumentar tamanho do logo para w-32 h-32
  - Aplicar cor vermelha (#C41E3A) ao título "C&R SUSHI"
  - Ajustar font-size e font-weight do título
  - Estilizar subtítulo "Sabores autênticos do Japão" com cor cinza claro
  - _Requirements: 1.2, 1.3, 1.4_

- [x] 4. Implementar novos estilos para botões de cidade






- [x] 4.1 Criar estilo para botões de cidade ativa

  - Aplicar background vermelho sólido (#C41E3A)
  - Configurar texto branco e ícone MapPin
  - Adicionar border-radius rounded-xl
  - Implementar hover effect com scale e shadow
  - _Requirements: 2.1, 2.2, 2.5_


- [x] 4.2 Criar estilo para botões de cidade inativa

  - Aplicar background escuro transparente
  - Configurar texto cinza e ícone AlertTriangle
  - Adicionar borda sutil
  - Ajustar opacity e cursor
  - _Requirements: 2.3, 2.4, 2.5_

- [x] 5. Adicionar elementos decorativos japoneses





- [x] 5.1 Implementar flores de cerejeira no canto inferior esquerdo


  - Criar ou importar SVG de flores de cerejeira
  - Posicionar absolute no bottom-left
  - Configurar tamanho e opacidade
  - Adicionar aria-hidden para acessibilidade
  - _Requirements: 1.5, 3.4_

- [x] 5.2 Implementar folhas de bambu no canto inferior direito


  - Criar ou importar SVG de bambu
  - Posicionar absolute no bottom-right
  - Configurar tamanho e opacidade
  - Adicionar aria-hidden para acessibilidade
  - _Requirements: 1.5, 3.5_
-

- [x] 6. Implementar responsividade




  - Adicionar media queries para mobile (320px-640px)
  - Adicionar media queries para tablet (641px-1024px)
  - Ajustar tamanhos de logo, títulos e padding por breakpoint
  - Ajustar ou ocultar elementos decorativos em mobile se necessário
  - _Requirements: 4.1_

- [x] 7. Garantir acessibilidade





  - Verificar contraste de cores entre texto e fundo
  - Adicionar labels apropriados aos botões
  - Configurar aria-hidden nos elementos decorativos
  - Adicionar suporte a prefers-reduced-motion
  - _Requirements: 4.2, 4.3_

- [x] 8. Testar implementação





  - Testar seleção de cidade ativa
  - Testar alerta de cidade inativa
  - Testar responsividade em diferentes tamanhos de tela
  - Testar em diferentes navegadores (Chrome, Firefox, Safari)
  - Validar acessibilidade com ferramentas automatizadas
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.2, 2.3, 2.4, 2.5, 3.1, 3.2, 3.3, 3.4, 3.5, 4.1, 4.2, 4.3, 4.4, 4.5_
