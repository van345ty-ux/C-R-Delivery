# Requirements Document

## Introduction

Este documento define os requisitos para o redesign da interface de seleção de localização (LocationSelect), seguindo o estilo visual apresentado no mockup de referência. O objetivo é criar uma experiência visual mais elegante e premium, com fundo escuro texturizado, elementos decorativos japoneses, e botões de cidade com design mais sofisticado.

## Glossary

- **LocationSelect Component**: O componente React responsável pela interface de seleção de cidade
- **Theme System**: Sistema de variáveis CSS que controla cores, fontes e estilos visuais
- **Active City**: Cidade disponível para seleção e entrega
- **Inactive City**: Cidade não disponível no momento
- **Background Pattern**: Padrão decorativo japonês (ondas) aplicado ao fundo
- **Decorative Elements**: Elementos visuais japoneses (flores de cerejeira, bambu) usados como ornamentação

## Requirements

### Requirement 1

**User Story:** Como usuário, eu quero ver uma interface de seleção de cidade com visual premium e temática japonesa, para que a experiência seja mais imersiva e elegante

#### Acceptance Criteria

1. THE LocationSelect Component SHALL render um fundo escuro com padrão de ondas japonesas (seigaiha) sutil
2. THE LocationSelect Component SHALL exibir o logo centralizado no topo com sombra circular
3. THE LocationSelect Component SHALL mostrar o título "C&R SUSHI" em vermelho (#C41E3A ou similar) com fonte display elegante
4. THE LocationSelect Component SHALL exibir o subtítulo "Sabores autênticos do Japão" em cinza claro
5. THE LocationSelect Component SHALL incluir elementos decorativos japoneses (flores de cerejeira e bambu) nos cantos inferiores do card

### Requirement 2

**User Story:** Como usuário, eu quero ver botões de cidade com design diferenciado entre ativas e inativas, para que eu entenda claramente quais opções estão disponíveis

#### Acceptance Criteria

1. WHEN uma cidade está ativa, THE LocationSelect Component SHALL renderizar o botão com fundo vermelho sólido (#C41E3A ou similar)
2. WHEN uma cidade está ativa, THE LocationSelect Component SHALL exibir texto branco com ícone de localização
3. WHEN uma cidade está inativa, THE LocationSelect Component SHALL renderizar o botão com fundo escuro transparente e borda sutil
4. WHEN uma cidade está inativa, THE LocationSelect Component SHALL exibir texto cinza com ícone de alerta triangular
5. THE LocationSelect Component SHALL aplicar bordas arredondadas (rounded-xl) em todos os botões de cidade

### Requirement 3

**User Story:** Como usuário, eu quero ver o card de seleção com fundo escuro semi-transparente e elementos visuais japoneses, para que a interface tenha uma aparência mais sofisticada

#### Acceptance Criteria

1. THE LocationSelect Component SHALL renderizar o card principal com fundo escuro (#1a1a1a ou similar) e transparência sutil
2. THE LocationSelect Component SHALL aplicar bordas arredondadas (rounded-3xl) no card principal
3. THE LocationSelect Component SHALL incluir padrão de ondas japonesas no fundo do card
4. THE LocationSelect Component SHALL posicionar flores de cerejeira decorativas no canto inferior esquerdo
5. THE LocationSelect Component SHALL posicionar folhas de bambu decorativas no canto inferior direito

### Requirement 4

**User Story:** Como usuário, eu quero que a interface mantenha responsividade e acessibilidade, para que funcione bem em diferentes dispositivos e seja utilizável por todos

#### Acceptance Criteria

1. THE LocationSelect Component SHALL manter responsividade em telas mobile, tablet e desktop
2. THE LocationSelect Component SHALL preservar contraste adequado entre texto e fundo para legibilidade
3. THE LocationSelect Component SHALL manter funcionalidade de hover e estados interativos nos botões
4. THE LocationSelect Component SHALL garantir que elementos decorativos não interfiram na usabilidade
5. THE LocationSelect Component SHALL manter a funcionalidade existente de alerta para cidades inativas
