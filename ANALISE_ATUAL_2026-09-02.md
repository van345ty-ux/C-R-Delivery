# Análise do projeto C&R Sushi — 02/09/2026

## Escopo e conclusão

Análise da cópia `CR SUSHI EDIT`, por conter funcionalidades adicionais em relação a `ANTES DA 2 AUDITORIA DE OTIMIZ`. A pasta superior também contém `versão estavel.zip`. Não foi feita uma comparação integral dos backups.

O projeto possui uma implementação ampla de delivery, mas a aprovação do build não representa aprovação de segurança ou de funcionamento ponta a ponta. As prioridades são permissões no banco, integridade do checkout e recuperação de falhas de autenticação.

Foi inspecionado o código local, incluindo a alteração preexistente em `supabase/functions/whatsapp-router/index.ts`. Nenhum código funcional foi alterado. Não foram consultados o banco remoto, configurações de implantação ou serviços de pagamento; não foram enviados pedidos ou mensagens. Não houve validação visual em navegador.

## Funcionalidades e arquitetura

- React 18, TypeScript, Vite 5, Tailwind CSS, Supabase e funções Deno.
- Seleção de cidade, catálogo, carrinho, entrega/retirada, cupons, conta do cliente e acompanhamento de pedidos.
- Checkout com Pix e link do Mercado Pago; a confirmação no navegador depende de estados locais e avisos. Não foi encontrada nestes fluxos uma consulta de confirmação ao provedor de pagamento.
- Administração de pedidos, produtos, clientes, cidades, promoções, cupons, marketing e configurações.
- Temas sazonais e pré-agendamento para Comandatuba. No fluxo atual de `App.tsx`, Comandatuba aceita pré-agendamento 24 horas; a documentação que descreve o intervalo 07h–17h está desatualizada.
- Integrações com n8n e WhatsApp por Edge Functions. O painel usa Realtime; o acompanhamento do cliente consulta o pedido a cada cinco segundos.
- Navegação por estado `currentView`; não há dependência de React Router no pacote atual.
- Há carregamento sob demanda do painel, autenticação, acompanhamento e recuperação de senha.

## Verificações executadas

| Verificação | Resultado |
| --- | --- |
| `npm.cmd run build` | Aprovado; Vite 5.4.19, 1.597 módulos transformados |
| `npm.cmd run lint` | Reprovado: 38 erros e 7 avisos |
| `tsc -b --pretty false` | Reprovado: 18 diagnósticos de erro |
| Bundle principal | 502,68 kB minificado; 142,47 kB gzip |
| Bundle administrativo | 149,56 kB minificado; 32,41 kB gzip |
| CSS | 82,90 kB; 14,29 kB gzip |

A primeira tentativa de build foi impedida pela restrição de leitura do ambiente. A execução autorizada fora dessa restrição terminou normalmente. Isso não era um erro do código.

O script `build` executa somente `vite build`, portanto não bloqueia a entrega pelos erros encontrados pelo TypeScript. Há erros de propriedades inexistentes (`user.full_name`, `world_cup_theme_active`), incompatibilidade entre `PromiseLike` e `Promise`, conversão de tipos de Presence e declarações não utilizadas. O lint também aponta usos de `any`, dependências de hooks ausentes e uma seção permanentemente desativada com `false &&`.

Não foram encontrados scripts de testes automatizados no `package.json` nem uma suíte executável de testes no código inspecionado. Existem relatórios manuais em `.kiro`, mas eles não comprovam o comportamento da versão atual.

## Achados prioritários

### 1. Crítico, condicionado às proteções efetivas do banco: perfil pode permitir elevação para administrador

Referências: `supabase/profile_policies.sql:33`, `supabase/profile_policies.sql:41`, `supabase/get_my_role.sql:7`.

As políticas de criação e edição do próprio perfil limitam o registro por `auth.uid()`, mas não restringem a coluna `role`. A função usada para conceder acesso administrativo consulta essa mesma coluna. Se estes scripts refletirem a configuração implantada e não houver grants por coluna ou triggers adicionais, um cliente poderá definir o próprio perfil como administrador por uma chamada direta à API.

Próxima ação: verificar os grants, triggers e políticas implantadas e impedir alterações de privilégios pelo cliente. Restringir o formulário visual não resolve a autorização no banco.

### 2. Alto: preços, descontos e consumo de cupom não são centralizados em uma operação de servidor

Referências: `src/components/Cart.tsx:71`, `src/components/Cart.tsx:239`, `src/components/Cart.tsx:365`, `src/components/Cart.tsx:417`.

O frontend restaura o cupom do localStorage, calcula o total e envia preços, quantidades e desconto diretamente para `orders`. O cupom não é novamente consultado ao finalizar; o incremento de uso acontece em uma chamada separada, depois da criação do pedido, e uma falha é apenas registrada no console.

Isso permite valores desatualizados no fluxo normal, além de risco de manipulação e concorrência caso o banco não recalcule e valide os dados. Dois clientes podem passar pela verificação de disponibilidade do mesmo cupom antes do incremento.

Próxima ação: criar uma operação transacional no servidor que receba identificadores e quantidades, consulte preços atuais, valide o cupom e registre pedido e consumo juntos. Não há migrações suficientes nesta cópia para confirmar se alguma proteção equivalente já existe no banco.

### 3. Alto: falha de perfil mantém carregamento infinito

Referências: `src/App.tsx:177`, `src/App.tsx:541`, `src/App.tsx:546`.

O carregamento permanece ativo enquanto existe sessão e o perfil é nulo. Quando `fetchUserProfile` falha, retorna `null`; o callback preserva a sessão e apenas desliga `authLoading`. A expressão de carregamento continua verdadeira, sem apresentar uma recuperação adequada. A consulta do perfil também não tem timeout próprio.

Próxima ação: representar explicitamente erro de carregamento de perfil e oferecer nova tentativa ou retorno à autenticação, com limite de duração da consulta.

### 4. Alto: handlers de WhatsApp não verificam autorização de negócio

Referências: `supabase/functions/whatsapp-router/index.ts:21`, `supabase/functions/order-status-update/index.ts:17`.

O roteador aceita `project_type` e encaminha o payload sem verificar papel administrativo para marketing, vínculo com pedido ou assinatura da origem para eventos de entrada. A função de atualização consulta pedidos usando service role sem validar no handler quem solicitou a operação.

O alcance externo depende da configuração do gateway/JWT e das proteções do n8n, não verificadas aqui. Mesmo uma validação de JWT precisa ser acompanhada da autorização apropriada para cada operação.

Próxima ação: verificar a configuração implantada, autorizar cada tipo de chamada e autenticar os eventos internos. Adicionar limites de envio e proteção contra reprocessamento conforme o fluxo.

### 5. Médio: horário da loja fica desatualizado com a página aberta

Referências: `src/App.tsx:428`, `src/App.tsx:473`.

O cálculo depende somente de cidade e lista de horários. Passar do horário de abertura ou fechamento não executa novamente o efeito. Uma página aberta antes do expediente pode continuar bloqueando pedidos; uma aberta antes do fechamento pode continuar permitindo a finalização. O cálculo usa o relógio e fuso do dispositivo e não trata intervalos que atravessam a meia-noite.

Próxima ação: recalcular periodicamente e no retorno à página, normalizar horários e fuso da loja e validar a disponibilidade também no servidor.

### 6. Médio: timeout de criação pode resultar em pedido duplicado

Referência: `src/components/Cart.tsx:390`.

O `Promise.race` mostra erro após 60 segundos, mas não cancela nem verifica o resultado da gravação. A mensagem orienta tentar novamente. Se a primeira inserção tiver ocorrido sem a resposta chegar ao navegador, a segunda tentativa pode gerar outro pedido. O payload não inclui chave de idempotência.

Próxima ação: usar um identificador único por tentativa lógica de checkout, com unicidade no banco, e recuperar o resultado antes de permitir nova gravação.

### 7. Médio: observações de um produto são substituídas ao adicionar outra unidade

Referência: `src/App.tsx:726`.

Itens são agrupados apenas por identificador do produto. Adicionar o mesmo sushi com outra observação soma as quantidades e substitui a observação anterior para todas as unidades. Adicionar sem observação também pode apagar uma instrução existente.

Próxima ação: distinguir linhas por produto e personalizações ou preservar instruções por unidade/grupo.

## Manutenção e desempenho

- `App.tsx` tem 939 linhas, `Cart.tsx` 1.198 e `components/admin/AdminSettings.tsx` 831. Regras comerciais, apresentação, autenticação e persistência estão muito concentradas.
- `useAuth`, `useCart`, `useAppData`, `useStoreStatus` e `useMercadoPagoReturnFlow` existem, mas não são importados pelo fluxo atual de `src`. Alterar esses arquivos isoladamente pode não mudar o aplicativo. Há duas versões de `AdminSettings`; o painel importa a de `components/admin`.
- O hook antigo `useAuth` aguarda `getSession()` dentro do callback de autenticação, um padrão com risco de deadlock documentado no próprio SDK instalado. Como esse hook está sem uso, esse achado não deve ser confundido com a causa do carregamento infinito do fluxo atual.
- O bundle inicial ultrapassa o limite de aviso do Vite. Há espaço para carregar modais e temas conforme necessário. Os arquivos locais `logo.png` e `logo_lovalty.png` têm cerca de 2,16 MB cada; avaliar quais são efetivamente usados e otimizar os que chegam ao cliente.
- O fallback do logo em `src/App.tsx:780` usa `public/assets/logo.png`, enquanto a saída do build contém `assets/logo.png`. Corrigir para `/assets/logo.png` evita imagem quebrada quando a configuração não está preenchida.
- npm e pnpm têm lockfiles próprios; escolher um gerenciador para instalações reprodutíveis.
- Os workflows n8n estão presentes localmente, mas são ignorados pelo Git. Não há conjunto completo de migrações de tabelas, funções e políticas para reconstruir o backend. A documentação sobre anonimização contém SQL proposto; sua existência no Markdown não comprova implantação.

## Ordem recomendada

1. Confirmar e corrigir autorização de perfis e Edge Functions no ambiente implantado.
2. Tornar o checkout transacional e idempotente, com cálculo e validação no servidor.
3. Corrigir recuperação de perfil, atualização do horário e observações dos itens.
4. Resolver os diagnósticos e incluir TypeScript/lint como critérios de entrega.
5. Consolidar código em uso, documentar o backend reproduzível e otimizar carregamento.

Os arquivos temporários de compilação TypeScript criados pela análise foram removidos. O build regenerou `dist`, que já é ignorado pelo Git. A alteração preexistente no roteador foi preservada.

## Etapa 1 concluída — correções conservadoras de tipagem e código sem uso

Esta seção registra o estado posterior à análise original. As contagens acima representam o diagnóstico inicial.

- TypeScript: de 18 erros para zero; `npm.cmd run typecheck` aprovado para aplicação e configuração do Vite.
- Lint: de 38 erros e 7 avisos para 21 erros e 7 avisos. As regras do ESLint e a configuração estrita do TypeScript foram mantidas.
- Build de produção aprovado. Bundle principal: 502,54 kB, 142,46 kB gzip. Não há evidência de ganho perceptível de desempenho nesta etapa.
- Foram corrigidos os tipos de sessão, configurações, Presence e argumentos de edição dos horários. O helper `withTimeout` passou a aceitar `PromiseLike` na assinatura; o JavaScript executado pelo helper não mudou.
- Foram removidos imports, parâmetros e variáveis desestruturadas sem uso. As interfaces de props continuam aceitando os mesmos dados.
- A notificação de acesso usa `user.name`, que é o campo preenchido ao transformar `profiles.full_name` no modelo `User`.
- Foi adicionado o comando `npm run typecheck`, que verifica tipos sem gerar arquivos. O comando de build existente foi preservado.

### Verificação de preservação dos fluxos

Foi salva temporariamente uma referência dos 58 arquivos TypeScript de `src` antes das alterações. A comparação por transpilação confirmou JavaScript idêntico em 54 arquivos. Nos quatro restantes, as diferenças corresponderam somente às mudanças revisadas: remoção de parâmetros/props não utilizados, nome na notificação e teste de `undefined` sobre a variável local recém-inicializada com a sessão recebida.

Os arquivos `Cart.tsx`, `PixInstructionsModal.tsx`, `PixReturnConfirmationModal.tsx`, `useMercadoPagoReturnFlow.ts` e `utils/whatsapp.ts` ficaram idênticos à referência anterior. As condições de pagamento, popups, abertura de abas, persistência de retorno e criação do pedido foram preservadas nesta etapa.

Não houve pagamento real, teste visual no navegador, alteração de banco ou publicação. A comparação de código e o build não substituem a homologação do fluxo completo no ambiente de teste antes de uma publicação. A alteração preexistente da Edge Function foi preservada.

As correções de permissões, transação do checkout, carregamento de perfil, atualização dos horários e observações do carrinho ainda estão pendentes. Os avisos de dependências de hooks também ficam para uma etapa específica, pois ajustes nessas dependências podem mudar quando efeitos e popups são executados.

## Etapa 2 concluída — erros restantes de lint

- `npm.cmd run lint`: aprovado, zero erros e os mesmos 7 avisos. Nenhuma regra de lint foi desativada.
- `npm.cmd run typecheck`: aprovado, zero erros.
- `npm.cmd test`: quatro testes aprovados para erros nativos, objetos retornados pela API, mensagens alternativas dos formulários e valores inesperados.
- `npm.cmd run build`: aprovado. Bundle principal: 502,68 kB, 142,52 kB gzip. O aviso de tamanho continua; esta etapa não é uma otimização de desempenho.

### Alterações realizadas

Os `any` explícitos restantes foram removidos por inferência de tipos ou tipos específicos. O timeout do carrinho usa `Promise<never>`, pois essa promessa somente rejeita; isso permitiu retirar a conversão do resultado de `Promise.race` sem modificar o JavaScript do checkout. Os itens retornados no acompanhamento possuem o tipo `StoredOrderItem`; o cálculo administrativo usa o tipo de item já definido no módulo.

Foi criado `src/utils/errors.ts` para ler mensagens de erros desconhecidos com segurança. Erros nativos e objetos do Supabase com `message` textual continuam exibindo a mesma mensagem. Formulários conservam os textos alternativos existentes. Valores inesperados, como `null` ou objetos sem mensagem, agora usam um texto alternativo em vez de causarem outra exceção ou exibirem `undefined`.

Variáveis que não recebem outra atribuição passaram a usar `const`. A seção de destaques do menu que já estava desativada continua desativada, agora por uma constante nomeada; promoções e banners não foram alterados. As dependências de efeitos e os estados dos popups permanecem iguais.

### Verificação de preservação

Comparação com uma referência temporária dos 58 arquivos de `src` no início desta etapa: 49 geram JavaScript idêntico; os outros 9 foram conferidos contra as alterações esperadas de mensagens de erro, declarações de variáveis e constante de exibição. Nenhuma diferença inesperada permaneceu após a revisão. O novo helper foi validado pelos quatro testes automatizados em `tests/errors.test.mjs`, executáveis com `npm test` sem novas dependências.

O JavaScript de `App.tsx`, `Cart.tsx`, `HomePage.tsx`, `PixInstructionsModal.tsx`, `PixReturnConfirmationModal.tsx`, `useMercadoPagoReturnFlow.ts`, `utils/whatsapp.ts` e `admin/AdminOrders.tsx` ficou idêntico ao início desta etapa. Isso preserva as condições de Pix, cartão e dinheiro, abertura de abas, avisos, retorno ao aplicativo, payloads e sequência de criação/notificação do pedido.

Não houve publicação, pagamento real, envio de mensagens, alteração de banco ou homologação visual no navegador. Permanecem pendentes os 7 avisos (5 relacionados a dependências de hooks e 2 a Fast Refresh) e as correções funcionais/de segurança descritas na análise original. Antes de publicar, ainda é necessária a homologação dos fluxos completos em ambiente de teste.

## Etapa 3 concluída — avisos de hooks e Fast Refresh

- `npm run lint`: aprovado, zero erros e zero avisos, sem desativar regras.
- `npm run typecheck`: aprovado.
- `npm test`: quatro testes aprovados.
- Verificação de interface em navegador com React real e dados simulados: sete cenários aprovados, zero tentativas de gravação ou envio.
- `npm run build`: aprovado. O aviso de bundle acima de 500 kB e o aviso da base Browserslist antiga continuam; eles não são avisos de lint. Bundle principal: 502,72 kB, 143,16 kB gzip.

### Decisões para preservar comportamento

O banner continua sendo recalculado quando `selectedCity` muda, agora lendo a cidade dentro do próprio cálculo. O efeito que coordena os popups inclui `isComandatuba` e `setShowPreOrderModal`: a troca de rota passa a atualizar o aviso e o setter recebido do `App` permanece estável. As condições que impedem promoções durante retorno de pagamento foram preservadas.

O efeito de cupons usa um ID derivado (`userId`) e continua disparando pela mudança desse ID, sem passar a depender da identidade de todo o objeto de usuário. A função `fetchData` dos cupons administrativos usa `useCallback` com o mês como dependência, evitando consultas em toda renderização; se o mês mudar durante uma renderização, a listagem pode ser atualizada para o novo mês.

O efeito da animação deixou de ler `visible` apenas para imprimi-lo no console. Seu temporizador continua sendo configurado na montagem e encerrado após 9 segundos, sem reinício ao ocultar a animação.

Contexto, tipos e hook de tema foram separados para `src/contexts/theme-context.ts`; o componente `ThemeProvider` continua em `ThemeContext.tsx`. O corpo da implementação do provider foi comparado e permaneceu igual. Os consumidores foram atualizados para importar o mesmo contexto compartilhado. O export de `buttonVariants`, sem consumidores no projeto, foi removido; a configuração e o componente `Button` permanecem iguais.

### Evidências e limites

O código de sete módulos centrais de pagamento/pedidos foi comparado com o início desta etapa: `App`, `Cart`, modais Pix, hook de retorno Mercado Pago, envio WhatsApp e pedidos administrativos. O JavaScript permaneceu igual, exceto pelo caminho de importação do hook de tema no carrinho.

Os sete testes de interface cobrem retorno Pix, retorno Mercado Pago, troca de cidade/fechamento do popup, dependência dos cupons por usuário, encerramento da animação, estabilidade da consulta administrativa e propagação do tema. Todos passaram no navegador, sem erros ou avisos capturados no console. Instruções para repetir estão em `tests/README.md`; executar `npm run test:ui` instala um cliente Supabase simulado exclusivamente para os testes.

Os retornos de pagamento foram verificados com flags simuladas e sacola vazia, para isolar os efeitos. Não houve validação com provedor real, produtos pagos, conta real, RLS ou n8n. Nenhuma alteração foi publicada. Permanecem pendentes as correções funcionais e de segurança da análise original e a homologação completa antes de publicar.

## Etapa 4 concluída — recuperação de falhas de carregamento da conta

Terminologia esclarecida pelo usuário: o aplicativo finaliza/registra o pedido; a página de pagamento externa abre em outra aba, no ambiente do provedor. As referências anteriores a checkout se referiam ao fluxo interno de finalização do pedido, e não a um processamento de pagamento embutido. Nenhuma cobrança ou confirmação automática foi adicionada.

Quando a consulta do perfil falha, o aplicativo agora apresenta uma tela com a ação **Tentar novamente**. A nova tentativa preserva sessão, cidade, itens/observações do carrinho e indicadores de retorno do pagamento. A saída explícita da conta continua com sua limpeza anterior.

A consulta HTTP do perfil, incluindo leitura do corpo da resposta e a tentativa preexistente de criação do perfil ausente, tem limite de 12 segundos e cancelamento com `AbortController`. A inicialização da sessão também apresenta recuperação após 12 segundos sem resposta. O timeout da sessão não força logout nem altera o armazenamento de autenticação.

As buscas do perfil permanecem fora do `await` do callback de autenticação, preservando a proteção contra travamento do SDK. Respostas de tentativas substituídas, componentes desmontados e operações anteriores à saída da conta são ignoradas. Um erro tardio da consulta inicial não substitui um perfil já recuperado por outro evento. Foi removida uma consulta redundante de sessão na inicialização.

O perfil só é marcado como processado após sucesso. Se uma atualização posterior do perfil falhar, os dados já carregados são mantidos e uma mensagem informa a falha, em vez de trocar o usuário por `null` e provocar carregamento infinito.

### Validação

- TypeScript e lint aprovados, sem erros nem avisos de lint.
- Build de produção aprovado; permanecem os avisos de tamanho do bundle e Browserslist. Bundle principal: 504,24 kB, 143,61 kB gzip.
- Quatro testes unitários aprovados.
- 14 cenários de interface aprovados em navegador: os sete anteriores e sete novos cenários de falha, timeout, recuperação e respostas atrasadas. As falhas foram provocadas por fixtures; seus logs de erro são esperados.
- A recuperação de uma falha HTTP foi testada com sacola preenchida, quantidades e observações, no retorno da página externa de pagamento. O timeout do perfil também preservou o indicador de retorno Pix.
- Comparação com o início da etapa: somente `src/App.tsx` foi alterado em `src`; todos os outros arquivos da aplicação, incluindo carrinho, modais e utilitário WhatsApp, ficaram idênticos.

Os testes bloqueiam integrações reais, usam sessão/dados fictícios e simulam a resposta da criação de perfil. Não houve pagamento real, mensagem enviada, alteração de dados remotos ou publicação. As correções de permissões, validação transacional do pedido, horário de funcionamento e observações de produtos continuam pendentes para próximas etapas.

## Etapa 5 concluída — atualização de horário com preservação do retorno de pagamento

O status da loja agora é recalculado a cada 30 segundos e imediatamente ao receber foco, `pageshow` ou voltar à visibilidade. O cálculo usa o fuso `America/Sao_Paulo`, aceita horários com segundos e considera turnos que atravessam meia-noite, inclusive domingo para segunda. A abertura inclui o instante configurado; o fechamento exclui esse instante. Horários iguais não significam funcionamento 24 horas.

Comandatuba mantém pré-agendamento 24 horas, inclusive quando não há grade disponível. Una depende da grade válida. A atualização usa os horários já carregados, sem consultar o banco a cada ciclo; mudanças da grade no painel não são sincronizadas em tempo real por esta alteração. O relógio é o do dispositivo, convertido ao fuso da loja.

O carrinho permite continuar o fluxo externo já iniciado quando a loja fecha, usando os indicadores locais existentes de cartão/Pix. Novas seleções de cartão/Pix ficam bloqueadas após fechar quando não há fluxo correspondente iniciado. Avisos que já estavam abertos podem ser concluídos. Pedidos em dinheiro não herdam a exceção. O retorno Pix continua exigindo suas instruções, chave e confirmação; a abertura do cartão continua com `_blank`, em outra aba.

A exceção não representa confirmação de pagamento: os indicadores continuam locais, sem comprovação bancária, vínculo transacional ou registro confiável do instante em que o pagamento começou. A validação do pedido no servidor segue como etapa separada.

### Validação

- TypeScript e lint aprovados, sem erros nem avisos de lint.
- 12 testes unitários aprovados: quatro anteriores e oito sobre horários.
- 22 cenários de interface aprovados: 14 anteriores e oito sobre atualização do relógio, eventos de retorno à aba, avisos abertos durante fechamento, continuação de cartão/Pix, bloqueio de novos pagamentos e pré-agendamento.
- Os cenários usam React real com relógio, dados e integrações simulados. A chamada de abertura de aba foi interceptada; não houve pagamento real, criação de pedido, envio ou gravação remota.
- Build aprovado: bundle principal de 505,44 kB, 144,00 kB gzip. Permanecem os avisos anteriores de tamanho do bundle e Browserslist.
- Comparação com a referência do início da etapa: somente `src/App.tsx` e `src/components/Cart.tsx` mudaram entre os arquivos existentes de `src`; foi adicionado `src/utils/storeStatus.ts`. A sequência de criação/notificação do pedido e os handlers de confirmação do cartão/instruções Pix ficaram idênticos. Os demais módulos, incluindo modais Pix e WhatsApp, foram preservados.

Nenhuma alteração foi publicada. Homologação com conta de teste e provedor externo continua pendente; estes testes locais não substituem essa verificação. Permissões, validação transacional do pedido e observações de produtos permanecem para próximas etapas.

## Etapa 6 concluída — observações preservadas por linha da sacola

O agrupamento agora considera produto e observação. Ao adicionar o mesmo produto com a mesma instrução, soma apenas a quantidade daquela linha. Instruções diferentes ficam separadas; adicionar uma unidade sem observação não apaga as instruções de outra. Os controles de quantidade e remoção recebem a identificação da linha, em vez de atingir todas as unidades do produto.

A identificação é derivada dos dados existentes por uma tupla JSON de ID do produto e observação. Não há novo campo obrigatório no banco ou no armazenamento local. Sacolas antigas continuam compatíveis, e as operações preservam os objetos anteriores ao atualizar o estado do React. Ausência de observação e texto vazio equivalem; outros textos são comparados exatamente, respeitando maiúsculas e pontuação. O tratamento de espaços já existente no formulário de produto foi mantido.

As chaves de renderização da sacola e do acompanhamento foram ajustadas para aceitar o mesmo produto em linhas distintas. Os rótulos acessíveis dos controles incluem a observação para distinguir as linhas. No acompanhamento, a posição também diferencia registros históricos eventualmente repetidos.

### Validação e preservação

- TypeScript e lint aprovados, sem erros nem avisos de lint.
- 20 testes unitários aprovados: 12 anteriores e oito sobre agrupamento, alteração/remoção isoladas, compatibilidade com sacolas salvas e preservação do estado/texto.
- 30 cenários de interface aprovados: os 22 anteriores e oito novos. A adição foi exercitada pelo cardápio e formulário reais, seguida de alteração de quantidade, restauração da sacola e remoção. Retornos de cartão/Pix conservaram os bloqueios de edição e as observações.
- Totais, desconto percentual e taxas de Una/Comandatuba foram verificados com várias linhas do mesmo produto.
- Dinheiro, cartão e Pix foram finalizados apenas em simulações locais: o registro e a notificação foram interceptados em memória. Cada linha, quantidade e observação permaneceu no payload de `orders` e no payload destinado ao WhatsApp. Os avisos do cartão, abertura em outra aba e instruções/confirmação Pix continuaram exigidos.
- O acompanhamento leu um pedido simulado e exibiu as três linhas, com suas observações, sem chaves React duplicadas.
- Build aprovado: bundle principal de 505,65 kB, 144,09 kB gzip. Continuam os avisos anteriores de tamanho do bundle e Browserslist.
- Comparação com a referência do início desta etapa: somente `App.tsx`, `HomePage.tsx`, `Cart.tsx` e `OrderTracking.tsx` mudaram entre os arquivos existentes de `src`; foi adicionado `utils/cart.ts`. O bloco de finalização do pedido, seus payloads e handlers de pagamento permaneceram idênticos. Os modais Pix, utilitário WhatsApp e hook antigo `useCart` não foram modificados. A alteração preexistente na Edge Function foi preservada.

Não houve pedido real, pagamento, mensagem enviada, alteração de banco ou publicação. Os testes comprovam a composição dos dados pelo aplicativo; entrega real da mensagem, processamento pelo n8n e validações no banco continuam dependendo da homologação integrada. Observações apagadas antes desta correção não podem ser reconstruídas. Permissões e validação transacional/idempotente do pedido seguem pendentes para etapas específicas.

## Etapa 7 preparada — proteção contra repetição de pedidos; ativação pendente

Foi implementado um caminho opcional de finalização com chave UUID persistente
por tentativa e por usuário. O cliente persiste os dados antes de gravar; falhas
de rede ou timeout mantêm a chave para recuperar o resultado. A recuperação usa
os dados originais, permite consultar após fechar a loja ou esvaziar a sacola e
não solicita outro pagamento. Itens acrescentados depois são preservados quando
o pedido anterior é confirmado. Respostas após troca de conta/desmontagem não
concluem o fluxo de outra conta/tela. Cliques na mesma instância compartilham a
operação; Web Locks serializam a reserva da chave entre abas quando disponíveis.

O SQL preparado acrescenta `orders.client_request_id` com índice único e as RPCs
`submit_order_once` e `claim_order_notification`. A primeira insere uma vez ou
recupera o pedido do usuário. Consumo do cupom e inserção ficam na mesma transação;
uma falha no consumo desfaz o pedido. A segunda reserva uma única notificação.
As funções usam SECURITY INVOKER, preservam RLS e não concedem privilégios novos
sobre pedidos. A tabela de reservas tem políticas próprias de acesso por titular.

### Dependência real encontrada

Não há definição completa de `orders` ou `increment_coupon_usage` no repositório.
O CLI Supabase, consultando apenas metadados do projeto configurado, retornou
recusa de privilégios da conta conectada. Não foram lidos pedidos de clientes
nem executadas alterações no banco remoto. A estrutura real, triggers, RLS e
compatibilidade da migração precisam ser revisadas com acesso autorizado.

Por isso, `VITE_ORDER_IDEMPOTENCY_ENABLED` permanece ausente/desativada. O build
atual usa o fluxo anterior; **a proteção ainda não está ativa para clientes**.
Não há fallback para inserção sem chave se a flag for ativada e a RPC falhar.
O roteiro de revisão/ativação está em `supabase/ORDER_IDEMPOTENCY.md` e as
consultas de metadados em `supabase/order_idempotency_preflight.sql`.

### Evidências locais

- TypeScript e lint aprovados; 30 testes unitários passaram.
- Build local aprovado com a flag desativada: bundle principal de 506,37 kB,
  144,32 kB gzip; os avisos anteriores de tamanho e Browserslist permanecem.
- Navegador: 30 cenários passaram no modo atual e 37 no modo protegido, sempre
  com integrações simuladas. Os cenários de dinheiro/cartão/Pix preservaram
  observações, totais, avisos, retorno e abertura em outra aba.
- PostgreSQL 15 descartável, sem rede, sem portas e com armazenamento temporário:
  migração, recuperação da mesma chave, observações, cupom/reserva únicos,
  rollback do cupom, RLS, recusa de outra conta/anon e reaplicação passaram.
- Duas conexões concorrentes repetiram a mesma chave: uma retornou criação e a
  outra recuperação; apenas um pedido, um consumo de cupom e uma reserva foram
  gerados para essa tentativa. Somando o cenário sequencial anterior, o banco de
  testes terminou com 2 pedidos, 2 usos e 2 reservas.
- A estrutura usada nesses testes é uma fixture local, não uma cópia verificada
  do Supabase implantado. Isso não comprova compatibilidade com produção.

Reservar notificação uma vez evita repetição, mas não garante entrega após falha
da aba/rede ou do serviço de mensagens. Uma fila com confirmação e deduplicação
no consumidor continua necessária para garantia de entrega. Apagar a chave,
usar outro dispositivo ou iniciar outra tentativa não é coberto como repetição
da mesma identidade. Falhas definitivas exigem correção/reconciliação antes de
descartar a tentativa; não se oferece gerar outra chave para contornar erro.

Não houve publicação, pagamento, envio real ou alteração remota. A implementação
está preparada para revisão; a etapa depende de acesso à estrutura real, revisão
da migração e homologação antes da ativação. Validação completa de preços,
descontos, permissões e entrega confiável de mensagens seguem como escopos separados.

### Complemento recebido — definição real do incremento de cupom

O usuário forneceu a definição de `public.increment_coupon_usage(uuid)`: retorna
void, usa SECURITY DEFINER e executa `UPDATE coupons SET usage_count = usage_count
+ 1 WHERE id = p_coupon_id`, sem configurar `search_path`. Isso confirmou um ponto
de compatibilidade que a fixture anterior não representava: a rotina nova usa
`search_path` vazio, e a função antiga procura `coupons` sem schema.

A migração local foi ajustada para qualificar `public.coupons` e fixar o
`search_path` da função antiga, mantendo assinatura, cálculo e SECURITY DEFINER.
CREATE OR REPLACE preserva proprietário e permissões da função existente. As duas
RPCs novas permanecem SECURITY INVOKER, mas o incremento delegado conserva as
permissões do proprietário da função antiga; sua autorização completa ainda
depende da revisão dos grants. Não houve aplicação no Supabase.

A fixture foi atualizada com a definição recebida e sem permissão direta de
UPDATE de cupons para authenticated. Os testes de repetição, cupom único,
rollback por erro, observações, reserva de notificação e isolamento por usuário
passaram novamente no PostgreSQL descartável. A consulta de metadados também
foi consolidada em uma tabela exportável para evitar resultados incompletos.

Ainda faltam os metadados completos de tabelas, índices, políticas, permissões,
proprietários e triggers. A ativação permanece pendente; o corpo dessa função
isoladamente não comprova compatibilidade de todo o banco.

### Revisão do export completo e próximo ensaio

As sete seções enviadas em Markdown foram lidas e convertidas para JSON válido:
29 colunas, 2 índices de orders, 13 políticas, RLS nas duas tabelas, 56 grants,
1 função e nenhuma linha de trigger de orders. As colunas esperadas pela migração
estão presentes; a chave de tentativa e as duas RPCs novas ainda não constam.

Os testes foram repetidos em outra fixture local com as colunas/defaults,
políticas e grants do export. A migração passou, assim como repetição, isolamento
por usuário, observações, cupom único, rollback e reserva de notificação.
Duas conexões concorrentes retornaram respectivamente criação e recuperação,
com uma reserva de notificação. Profiles/get_my_role, grants da sequência e
constraints não recebidas ainda são simulados: o teste não é homologação remota.

As permissões recebidas confirmam execução anônima do incremento como postgres
e escrita de cupons gerais/próprios por clientes autenticados. Foram registradas
para revisão de autorização separada; não se alteraram essas permissões nesta etapa.

Foi preparado `supabase/TESTAR_MIGRACAO_SEM_SALVAR.sql`, um ensaio do DDL encerrado
com ROLLBACK. O teste local comprovou ausência das estruturas novas e restauração
da função antiga após o término. O ensaio não cria pedidos nem envia mensagens,
mas mantém locks de DDL transitoriamente; deve ser executado inteiro em momento
de baixo movimento. A próxima ação externa é executar esse arquivo no SQL Editor
e enviar o resultado/erro. A migração permanece não aplicada no Supabase e a flag
do aplicativo segue desativada.

### Resultado do ensaio informado pelo usuário

O usuário retornou a mensagem esperada: "Ensaio concluído. Todas as alterações
desta transação foram desfeitas." O ensaio foi concluído com ROLLBACK; a migração
definitiva e a ativação do aplicativo continuam pendentes. Esse resultado valida
a execução do script no banco utilizado, mas não substitui testes funcionais das
RPCs com autenticação. Antes de orientar a aplicação definitiva, falta identificar
se existe um Supabase separado para homologação ou se o ensaio foi feito em produção.

### Ambiente confirmado: produção

O usuário confirmou que o Supabase consultado é o banco usado pelos clientes.
A migração definitiva não foi aplicada e a proteção permanece desativada.
Foi preparada `supabase/CONSULTAR_DEPENDENCIAS_PEDIDOS.sql`, somente leitura de
metadados com SELECT, para completar as dependências ainda simuladas:
profiles/políticas, get_my_role, constraints, sequência/permissões, enums e
triggers de cupons. Não consulta registros de clientes nem executa funções de
negócio. A próxima etapa depende desse resultado para aperfeiçoar a reprodução
isolada; não se orientou executar fixtures ou a migração definitiva em produção.

### Dependências recebidas e compatibilidade validada localmente

O segundo Markdown trouxe as sete seções completas, preservadas em
`tests/order-dependencies.received.json`. A reprodução local agora inclui
37 colunas, 17 políticas, 10 constraints, get_my_role real e permissões da
sequência. Não há triggers de cupons ou enums listados. Auth/usuários continuam
fictícios; não é uma cópia integral de produção. O máximo bigint da sequência foi
arredondado no export e foi representado pelo limite padrão exato do PostgreSQL.

PostgreSQL 15 descartável, sem rede: passaram os testes de perfil/RLS e INSERT
antigo sem chave, número automático e consumo de cupom antes e depois da migração.
Passaram também criação/repetição, preservação de observações, cupom único,
reserva única, rollback de falha de cupom, isolamento entre clientes e negação
de acesso anônimo às novas RPCs. Duas conexões simultâneas produziram criação/true
e recuperação/false, com apenas uma reserva de envio; totais verificados.

Próximo passo preparado: aplicação permanente da migração no SQL Editor pelo
usuário, em baixo movimento, mantendo a flag desativada. A migração e a ativação
ainda não foram realizadas em produção. Testes da API e homologação funcional
dos pagamentos externos continuam pendentes antes de publicar/ativar o frontend.
As permissões de atualização do papel no próprio perfil foram registradas para
revisão específica, sem afirmar exploração real: triggers de profiles não foram
exportados. Nenhuma permissão de perfil foi alterada nesta etapa.

### Aplicação em produção: sucesso informado pelo usuário

O usuário informou sucesso ao executar a migração definitiva no SQL Editor.
Foi preparado `supabase/VERIFICAR_PROTECAO_PEDIDOS.sql`, somente leitura de
metadados, para conferir a instalação e as permissões. São nove verificações de
estrutura/RLS/grants e propriedades das funções; não executa pedidos ou pagamentos
nem valida toda a lógica das políticas/funções. A proteção no aplicativo permanece
desativada; aguardam-se resultado dessa consulta e validação da API antes da ativação.

### Instalação conferida e diagnóstico da API preparado

O usuário enviou as nove linhas OK da verificação de produção. A instalação
está confirmada nos critérios consultados. As duas funções novas foram acessadas
pela API sem sessão: ambas retornaram HTTP 401 / 42501 por negação de execução.
Foram usados apenas IDs nulos, sem pedidos, cupons ou mensagens reais.

Foi preparada uma página de diagnóstico local em
`http://127.0.0.1:8084/tests/order-api-check.html`, para login de uma conta customer
e cinco verificações sem gravação de pedidos. Sessão exclusiva em memória, sem
persistência/renovação, encerrada com scope local ao fim. Senhas/tokens não são
impressos. Login/logout podem gerar registros de autenticação no Supabase.
Quatro testes locais de payload/respostas passaram; a página foi conferida no
navegador. Não foi feito login real pelo agente. Aguarda-se o resultado autenticado
do usuário. Isso não substitui testes de criação pela API ou pagamentos externos.

A flag permanece desativada; não houve publicação. O servidor local de diagnóstico
foi deixado disponível para o usuário realizar a conferência.

### Acesso autenticado confirmado e compilação preparada

O usuário realizou o login no diagnóstico. A página exibiu cinco OK: duas
negações anônimas, perfil customer, recusa de criação sem ID e reserva sem ID
retornando false. Foram lidos apenas os resultados visíveis, sem credenciais
ou armazenamento de sessão. Nenhum pedido, cupom ou envio foi provocado pelo teste.

Foi compilada uma versão separada com a proteção ligada por variável apenas do
processo, em `dist/order-protection-preview`. Build concluído: principal 509,03 kB,
gzip 145,38 kB; permanecem avisos de tamanho de chunk e Browserslist desatualizado.
Não houve alteração de .env nem publicação. O artefato usa a API configurada de
produção; não constitui ambiente isolado para criar pedidos fictícios.

A instalação, os caminhos de acesso da API testados e a compilação com flag ligada
estão conferidos. A criação efetiva pela API e a validação final dos fluxos de
pagamento continuam pendentes antes de ativar para os clientes.

### Integração local com API real — oito testes aprovados

Foram criados PostgreSQL 15 e PostgREST 14.5 em rede Docker interna, sem portas
publicadas. A fixture usa os metadados recebidos, a migração e clientes/JWTs
fictícios. O executor Node monta apenas o bundle do teste, sem .env de produção.
O teste bloqueia destinos externos e exige marcador do ambiente descartável.

Passaram oito testes via SDK Supabase e createOrderSubmitter real: autenticação
e recusa anônima; criação/repetição/novo pedido nos três valores de pagamento;
perda da resposta após COMMIT e retomada por outra instância; concorrência;
rollback em falha de cupom; isolamento entre clientes. Conferidos pedido/cupom/
reserva únicos e preservação das observações e do payload original.

Nenhum pagamento ou mensagem real foi enviado. Notificações foram capturadas
em memória; valores cash/pix/card verificam dados do pedido, não a cobrança.
O ambiente descartável foi encerrado. Não houve publicação, alteração da flag
ou pedidos de produção. A conferência operacional dos fluxos externos continua
pendente antes de ativar para os clientes.

### Conferência visual de dinheiro, Pix e cartão — concluída

Foi preparada a página `tests/payment-flow-check.html` com Cart e modais reais,
flag ligada somente no servidor local de teste, dados fictícios e gravações
bloqueadas. Não há acesso ao banco real; a chave Pix é fictícia e a aba de cartão
aponta para outra página local. Nenhum handler/modal de produção foi alterado.

Conferidos por cliques no navegador: exigência de troco, recusa de valor menor
que o total, instruções Pix e bloqueio inicial, confirmação ao retomar a sacola,
aviso do cartão e abertura efetiva de outra aba. A apresentação do modal Pix foi
inspecionada por imagem. Depois do retorno do cartão, o bloqueio intencional da
fixture acionou “Verificar pedido anterior” sem nova aba de pagamento.

Uma tentativa foi bloqueada pela fixture; não houve pedido, mensagem ou cobrança
real. O cenário foi reiniciado e a aba externa de teste fechada. O servidor local
foi deixado disponível para revisão. Essa inspeção não valida uma transação
financeira nem a disponibilidade do link comercial no provedor externo.

Publicação/ativação continuam pendentes. Foi encontrado vercel.json com cabeçalhos,
sem .vercel/project.json local; falta identificar o endereço/projeto do site em uso.

### Site de produção identificado; acesso à hospedagem pendente

O usuário informou https://cr-sushi.vercel.app/. O navegador carregou a seleção
de cidades do C&R Sushi. A entrada publicada é `index-C2aShScp.js` e o CSS é
`index-DWYoGt34.css`. A leitura pública do JavaScript confirmou a mesma URL do
Supabase local e ausência das chamadas submit_order_once/claim_order_notification
nesse arquivo. Não foram impressas chaves ou credenciais.

O Git local aponta para van345ty-ux/C-R-Delivery, branch main, com alterações
ainda não confirmadas/publicadas. Não há vínculo local .vercel/project.json ou
CLI Vercel disponível. O painel Vercel solicitou login; não havia navegador de
extensão conectado como alternativa. O usuário precisa entrar na conta Vercel
responsável pelo site para conferirmos o vínculo e a implantação atuais.

Foi preparado `supabase/PLANO_ATIVACAO_VERCEL.md`, incluindo confirmação de destino,
prévia antes de promoção, cuidados com artefatos de testes e reconciliação de
tentativas em uma reversão. Nenhum push, publicação ou alteração na Vercel foi feito.
