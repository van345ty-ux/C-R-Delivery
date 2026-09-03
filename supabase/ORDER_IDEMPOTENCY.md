# Proteção de tentativas de pedido — preparada, não ativada

A implementação local usa uma chave UUID persistida antes da gravação. Timeout,
falha de rede, nova renderização ou recuperação repetem a mesma chave e os dados
originais. A unicidade é garantida pelo banco para essa chave, não pelo botão.
O pedido recuperado mantém os dados registrados; itens acrescentados depois
permanecem na sacola. Não se repete o pagamento nem seus avisos na recuperação.

## Estado e condição de ativação

A variável `VITE_ORDER_IDEMPOTENCY_ENABLED` está ausente da configuração atual;
isso mantém o fluxo anterior. O usuário informou sucesso ao executar a migração
definitiva no Supabase de produção e retornou as nove linhas OK de
`VERIFICAR_PROTECAO_PEDIDOS.sql`. A instalação está conferida nesses critérios;
a ativação no aplicativo continua pendente.
A interface real da sacola também foi conferida no navegador com dados fictícios
e gravações bloqueadas (dinheiro/Pix/cartão e abertura real de aba local). Não foi
feita transação financeira externa. O usuário identificou o site como
https://cr-sushi.vercel.app/. Ele usa a mesma URL Supabase local; a entrada publicada
`index-C2aShScp.js` não contém as duas chamadas de proteção. O painel Vercel está
sem login disponível. Preparação da publicação em `PLANO_ATIVACAO_VERCEL.md`.
O usuário confirmou o resultado do ensaio no SQL Editor: "Ensaio concluído.
Todas as alterações desta transação foram desfeitas." Isso confirma a execução
do script transacional com ROLLBACK, não o funcionamento das RPCs pela aplicação.
A conta disponível no CLI recebeu uma recusa de privilégios ao consultar os
tipos do projeto configurado. O usuário forneceu posteriormente as sete seções de
metadados: 29 colunas, 2 índices de pedidos, 13 políticas, 2 tabelas com RLS,
56 grants, a função de cupom e nenhum trigger de pedidos listado. A definição da função de cupom foi fornecida
pelo usuário: `SECURITY DEFINER`, sem `SET search_path`, com `UPDATE coupons SET
usage_count = usage_count + 1 WHERE id = p_coupon_id`. Os testes SQL usam uma estrutura local
de referência; não são um dump completo de produção. O export foi preservado em
`tests/order-schema.received.json`. Uma segunda fixture reproduz as colunas,
políticas e grants recebidos. O segundo export, preservado em
`tests/order-dependencies.received.json`, completou profiles, get_my_role,
permissões da sequência e constraints. A fixture atual reproduz 37 colunas,
17 políticas e 10 constraints, com auth e usuários fictícios. Isso ainda não é
uma cópia completa do Supabase nem um teste de sua API ou dos pagamentos externos.

### Ensaio transacional no Supabase — resultado recebido

`TESTAR_MIGRACAO_SEM_SALVAR.sql` contém a migração preparada com ROLLBACK no lugar
de COMMIT. Executar **todo o arquivo**, incluindo o ROLLBACK, no SQL Editor.
Não cria pedidos nem chama as RPCs de finalização/envio. Ao terminar com sucesso,
o resultado informa que as alterações foram desfeitas. Este passo testa a
aceitação do DDL no banco real, sem deixar a migração aplicada. Não substitui a
homologação funcional com contas de teste antes da ativação.

O ensaio adquire locks transitórios nas tabelas: pode aguardar ou bloquear
brevemente consultas concorrentes. Usa os limites de espera/execução da migração;
executar em momento de baixo movimento. Caso falhe, enviar o erro completo e
não executar apenas trechos. A cópia local foi verificada em banco descartável:
coluna, funções e tabela novas ficaram ausentes após ROLLBACK, e a definição
anterior do contador de cupom foi restaurada.

O usuário confirmou que o Supabase usado no ensaio atende os clientes: é produção.
Não foi informada a existência de um ambiente separado de homologação. A aplicação
definitiva teve sucesso informado pelo usuário; a ativação continua pendente.

O resultado de `CONSULTAR_DEPENDENCIAS_PEDIDOS.sql` foi recebido e revisado.
get_my_role corresponde à definição local; authenticated tem USAGE/SELECT/UPDATE
na sequência. Não foram listados triggers de cupons nem enums nas três tabelas.
As permissões e políticas de profiles, e as constraints de orders/coupons/profiles,
foram incorporadas aos testes. O export arredondou o máximo bigint da sequência;
a fixture usa NO MAXVALUE para obter o limite exato do PostgreSQL e não copia o
valor atual da sequência. Auth é simulado e triggers de profiles não foram exportados.

Com essas definições, passaram os testes de repetição, concorrência, cupom,
rollback e isolamento entre clientes. O INSERT antigo sem chave, a geração do
número e a chamada antiga de cupom também passaram antes e depois da migração,
com papel authenticated e policies/RLS recebidos.

O usuário informou sucesso após executar `migrations/202609020001_order_idempotency.sql`.
`VERIFICAR_PROTECAO_PEDIDOS.sql`, somente SELECT de metadados, confere
coluna/índice, tabela/RLS, vínculos, presença das duas políticas, grants e propriedades
das funções. O esperado são nove linhas OK. A consulta não executa as RPCs nem lê
registros de clientes; não valida toda a lógica das políticas ou funções.
Foi testada no PostgreSQL local: nove REVISAR antes da migração e nove OK depois.
O usuário enviou as nove verificações OK do banco de produção.
Essa preparação do banco não autoriza ativação/publicação do frontend: testes da
API e homologação dos fluxos de pagamento permanecem pendentes.

### Verificação da API sem gravação de pedidos

`node tests/check-order-api.mjs` usa a URL/chave pública de .env, sem imprimir
credenciais. Foi executado contra a API configurada: as duas RPCs recusaram o
acesso anônimo com HTTP 401 / 42501, com negação de execução da função correta.
O teste não confunde RPC inexistente (PGRST202) com acesso bloqueado.

Próximo passo: iniciar `npm run dev -- --config tests/vite.api-check.config.mjs`
e abrir `http://127.0.0.1:8084/tests/order-api-check.html`. O usuário entra com
uma conta comum de cliente, na própria página, sem enviar a senha na conversa.
Esperam-se cinco OK: duas recusas anônimas, perfil customer, recusa de criação sem
ID e retorno false de reserva sem ID. A sessão é exclusiva do diagnóstico,
mantida em memória, sem persistência ou renovação automática; ao terminar, é
encerrada com scope local, sem encerrar outras sessões da conta. Login/logout
podem constar nos registros de autenticação do Supabase.

As chamadas de pedido/reserva usam p_request_id NULL; a primeira é rejeitada antes
do INSERT e a segunda não encontra linhas para reservar. Não há pedido, consumo
de cupom, notificação ou pagamento. São verificações de acesso e caminhos de
validação, não um teste de criação pela API. Nenhuma credencial/sessão é impressa
no resultado. Quatro testes locais verificam os payloads fixos e a classificação
das respostas. A página foi aberta e conferida no navegador sem fazer login real.
O usuário fez login na página; o navegador exibiu os cinco resultados OK,
incluindo perfil customer, recusa de criação sem ID e reserva sem ID retornando
false. A conferência foi feita pelos resultados visíveis, sem ler credenciais
ou armazenamento de sessão. O acesso autenticado nesses caminhos está validado;
a criação efetiva pela API e os pagamentos continuam fora desse diagnóstico.

A configuração de diagnóstico fixa a flag como false e não participa do build
de produção. Não foi feita nova publicação nem ativação do aplicativo.

### Compilação separada com proteção ligada

Após os cinco OK, foi executado `npm run build -- --outDir dist/order-protection-preview`
com VITE_ORDER_IDEMPOTENCY_ENABLED=true somente no processo de compilação.
O build passou; a configuração .env não foi alterada e não houve publicação.
Artefato: `dist/order-protection-preview`, ignorado pelo Git como parte de dist.
O bundle principal ficou em 509,03 kB (gzip 145,38 kB). Permanecem os avisos de
Browserslist desatualizado e chunk acima de 500 kB; não houve erro de compilação.
Essa compilação usa a API configurada de produção: não deve ser tratada como um
banco de testes nem usada para finalizar pedidos sem planejar os efeitos reais.
A conferência final de criação e dos fluxos de pagamento segue pendente antes
de publicar/ativar. A página de diagnóstico não carrega essa compilação.

### Criação e recuperação pela API isolada — concluído

Foi criada uma rede Docker interna com PostgreSQL 15, PostgREST 14.5 e um runner
Node. O banco usa os dois exports de metadados e a migração, com dados fictícios.
Auth/JWT são locais; não houve uso de credenciais ou pedidos de produção.
O runner monta somente o teste empacotado e compartilha a rede da API sem publicar
portas. Um marcador exclusivo identifica o banco antes de permitir as escritas.

O teste usa o SDK Supabase do projeto e createOrderSubmitter real. Passaram oito
cenários: autenticação/recusa anônima; criação e repetição para cash, pix e card;
perda de resposta após COMMIT com recuperação em outra instância; concorrência;
rollback de falha de cupom; isolamento entre clientes. Conferiu unicidade de pedido,
cupom e reserva, preservação das observações e liberação de novo pedido após a
confirmação da interface. A entrega de mensagens foi capturada em memória.

Arquivos/reprodução em `tests/README.md`, seção de integração local. O ambiente
foi encerrado e seus dados fictícios descartados. A integração entre a rotina e
a API local está validada; o teste não executa pagamento externo nem os pop-ups
da interface. Os testes de navegador anteriores cobrem esses controles com
simulação. A conferência operacional final e a ativação/publicação em produção
continuam separadas. A flag de produção não foi alterada.

### Conferência dos controles de pagamento no navegador — concluída

`tests/payment-flow-check.html` carrega Cart e modais reais, com a flag ligada
somente na configuração de teste e com o cliente de dados substituído pela fixture
que recusa gravações. A chave Pix é fictícia e o cartão abre uma página local.
Não houve alteração nos handlers/modais de produção nesta conferência.

Passaram os controles de troco (escolha obrigatória e valor menor rejeitado),
instruções Pix com total e bloqueio inicial, confirmação de retorno ao remontar
a sacola, aviso do cartão e abertura real de outra aba. Após retorno, o bloqueio
intencional de gravação exibiu a recuperação da tentativa sem nova aba de pagamento.
O teste não confirma cobrança nem disponibilidade do checkout externo comercial.

A etapa de conferência da interface está concluída. Publicação/ativação seguem
pendentes; o endereço do site/projeto de hospedagem ainda precisa ser identificado.
O vercel.json existente contém cabeçalhos, sem identificar o projeto remoto.
O domínio foi informado depois como cr-sushi.vercel.app; falta o login na Vercel
para conferir o projeto e a implantação vinculados. Não houve publicação ou push.

### Achados separados de autorização

O export confirma execução de `increment_coupon_usage` por anon/PUBLIC, como
SECURITY DEFINER pertencente a postgres, e políticas que permitem a clientes
autenticados criar, alterar e excluir cupons gerais ou próprios. Essas permissões
exigem uma correção específica, com revisão dos chamadores. Não foram alteradas
pela migração de idempotência; a proteção de repetição não as resolve.

O segundo export mostra UPDATE do próprio perfil e grant UPDATE na tabela inteira,
incluindo a coluna role. É necessário revisar a proteção de alteração de papel:
triggers de profiles e possíveis guardas adicionais não vieram nesse export, por
isso não se afirma exploração comprovada em produção. A etapa atual não altera
essas permissões nem representa uma correção completa de autorização.

### Sequência de homologação e ativação

1. Executar `order_idempotency_preflight.sql` com uma conta autorizada e revisar
   o resultado. É somente leitura de metadados, sem pedidos de clientes.
2. Conferir os tipos/colunas usados, defaults de ID e número, permissões de
   SELECT/INSERT em `orders`, leitura de cupons, execução e comportamento de
   `increment_coupon_usage(uuid)`. Conferir triggers de pedidos para evitar
   duplicar efeitos já existentes, inclusive notificações e consumo de cupom.
3. Aplicar `migrations/202609020001_order_idempotency.sql` primeiro em homologação
   (executado no PostgreSQL local descartável com os metadados recebidos).
   O script usa transação, limite de espera de locks e não altera políticas de
   `orders`. As duas novas funções usam SECURITY INVOKER e respeitam as políticas
   de pedidos. A função antiga do cupom continua SECURITY DEFINER; a migração
   qualifica `public.coupons` e fixa seu `search_path` sem alterar assinatura,
   cálculo, proprietário ou grants existentes. Isso evita falha ao chamá-la da
   nova rotina, cujo `search_path` é vazio.
4. Validar criação, repetição, concorrência, RLS entre duas contas e cupom no
   ambiente de homologação. Reproduzir falha de resposta após commit e recuperação.
5. Somente após a revisão, definir `VITE_ORDER_IDEMPOTENCY_ENABLED=true` no build
   de homologação e testar os fluxos de dinheiro, Pix e cartão. A flag é de build;
   mudá-la exige recompilar. Publicação e ativação em produção são passos separados.

Se as RPCs faltarem ou rejeitarem uma tentativa com a flag ligada, o aplicativo
preserva a tentativa e mostra recuperação. Não há fallback para INSERT sem chave.
Para falhas definitivas de dados/permissões, corrigir a causa e reconciliar pelo
`client_request_id` antes de descartar a tentativa. Nunca gerar outra chave só
porque a resposta demorou. Não apagar `cr-sushi:pending-order:<userId>` enquanto
o resultado da tentativa for desconhecido.

## Banco e efeitos

- `orders.client_request_id` é opcional, com índice UNIQUE; registros antigos
  continuam válidos. Chamadas antigas sem chave não ganham idempotência.
- `submit_order_once` insere uma vez ou retorna o pedido do próprio usuário.
  O consumo do cupom é feito só na inserção vencedora, dentro da transação.
  Falha desse consumo desfaz a inserção. Preços/descontos e toda a validade do
  cupom ainda dependem da revisão de validação no servidor, que é outra etapa.
  O incremento delega à função SECURITY DEFINER preexistente. Sua execução direta
  ainda não valida titularidade, validade ou limite do cupom no corpo recebido;
  revisar seus grants e os chamadores continua pendente. Esta mudança de
  compatibilidade não deve ser interpretada como correção completa de autorização.
- `claim_order_notification` registra uma reserva única de notificação em tabela
  com RLS. Recuperar uma resposta perdida da criação ainda pode reservar o envio.
  Isso evita envios repetidos pela mesma tentativa, mas NÃO é uma fila garantida:
  se a aba/rede falhar depois da reserva ou o envio falhar, a mensagem pode não
  chegar. A reserva não confirma entrega. É necessária reconciliação operacional
  ou, em etapa posterior, uma fila com confirmação e deduplicação no consumidor.
- Uma tentativa confirmada pela interface libera um pedido novo legítimo.
  A proteção cobre repetições da mesma chave; apagar o armazenamento, usar outro
  dispositivo ou iniciar outra tentativa gera outra identidade. A reserva local
  usa Web Locks quando disponível para serializar a criação da chave entre abas;
  navegadores sem essa API mantêm apenas a trava da instância e a unicidade da
  chave já salva. Não é detecção geral de pedidos parecidos.

## Verificações locais realizadas

PostgreSQL 15 descartável em Docker, sem rede/portas e sem volume persistente:
repetição recupera o mesmo registro; observações preservadas; cupom e reserva
de notificação únicos; rollback em erro de cupom; RLS e usuário indevido;
revogação de acesso anônimo; concorrência em duas conexões; reaplicação da migração.
Depois de receber a definição real do incremento, a fixture foi ajustada para
reproduzi-la e retirar UPDATE direto de cupons do papel authenticated. O teste de
rollback usa um trigger exclusivo da fixture para provocar a falha, preservando
a definição de incremento informada pelo usuário.

Fixtures e scripts: `tests/order-schema.fixture.sql`, `tests/order-idempotency.sql`
e `tests/order-concurrent.sql`. A fixture **não deve ser aplicada no Supabase real**.
Em um banco descartável novo, executar fixture, migração e teste de idempotência,
nessa ordem. Executar o script de concorrência em duas conexões simultâneas.
O total esperado depois dos dois grupos é 2 pedidos, 2 usos do cupom TESTE e 2
reservas. Uma conexão concorrente retorna `created=true` e a outra `created=false`.

O frontend tem testes unitários de resposta perdida, timeout/aborto, retomada,
duplo clique, duas instâncias, isolamento por conta, armazenamento indisponível,
falha na reserva e liberação de um novo pedido. Testes de navegador cobrem também
recuperação com sacola vazia/loja fechada, troca de conta e preservação de itens
novos. Nenhum pedido, pagamento ou mensagem real foi usado.

## Reversão

Desativar a flag e recompilar preserva o funcionamento anterior, mas perde a
proteção para novas gravações e não recupera tentativas pendentes pelo fluxo novo.
Antes de reverter, reconciliar tentativas em andamento. Não remover colunas,
índice, tabela ou funções durante uma reversão rápida; builds ainda abertos
podem depender deles. O SQL acrescenta estruturas compatíveis com o código antigo.
