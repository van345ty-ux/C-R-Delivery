# Verificação local

`npm test` executa 30 testes unitários: nove de tentativas de pedido, nove de linhas da sacola (agrupamento por
observação, quantidade, remoção, restauração e preservação do estado), quatro de
mensagens de erro e oito de
horários (limites de abertura/fechamento, segundos, fuso de Brasília, virada de
dia/semana, grade ausente/inválida e pré-agendamento de Comandatuba).

Para os cenários de interface, execute `npm run test:ui` e abra
`http://127.0.0.1:8082/tests/ui-regression.html` em um navegador. A página executa
os testes e mostra o resultado de cada cenário. Recarregue a página para repetir.

Esta configuração usa os componentes reais e substitui o cliente Supabase por
`fixtures/supabase.mjs`. Consultas usam dados simulados; operações de gravação,
RPC e envio são bloqueadas por padrão. Três cenários interceptam o registro do
pedido e a notificação exclusivamente em memória, sem rede. A página também restringe conexões de rede à origem
local. Use a configuração `test:ui`, pois ela instala essa substituição.

Os 30 cenários verificam:

1. Retorno do Pix abre carrinho e não dispara promoções/popups sazonais.
2. Retorno do Mercado Pago mantém a mesma proteção.
3. Troca de Una para Comandatuba apresenta o aviso e não o reabre após fechar.
4. Cupons só são consultados novamente quando o ID do usuário muda.
5. Animação da Copa encerra após o temporizador de 9 segundos sem reiniciá-lo
   (o teste dispara o callback do temporizador para não aguardar o tempo real).
6. Renderizações comuns não repetem a carga dos cupons administrativos.
7. O contexto de tema comunica a alternância ao consumidor e ao documento.
8. Falha HTTP ao carregar o perfil apresenta nova tentativa e recupera o retorno
   do pagamento externo, preservando itens, quantidades e observações da sacola.
9. Perfil sem resposta é cancelado pelo timeout e preserva o retorno Pix.
10. Perfil ausente com criação simulada recusada oferece recuperação.
11. Consulta da sessão rejeitada oferece recuperação.
12. Consulta da sessão sem resposta oferece recuperação após o limite de tempo.
13. Resposta tardia do perfil não restaura a conta após a saída explícita.
14. Erro tardio da consulta inicial da sessão não substitui uma conta já recuperada.
15. Temporizador atualiza abertura/fechamento sem alterar sacola ou repetir consultas.
16. Foco, `pageshow` e retorno de visibilidade atualizam o horário imediatamente.
17. Fechamento preserva aviso do cartão, abertura em outra aba e continuação do pedido.
18. Loja fechada não permite iniciar novo pagamento; flag de retorno sozinha não libera pedido.
19. Instruções Pix já abertas permanecem e o retorno à aba exige confirmação.
20. Pix iniciado pode continuar após fechar; dinheiro não herda essa exceção.
21. Retorno Pix continua exigindo chave configurada e instruções.
22. Comandatuba permite pré-agendamento após fechar e durante a madrugada.
23. Adição pelo cardápio separa observações; quantidade, remoção e restauração isolam cada linha.
24. Retorno do cartão preserva linhas e os bloqueios de edição.
25. Retorno Pix preserva linhas e os bloqueios de edição.
26. Linhas separadas mantêm subtotal, desconto e taxas de Una/Comandatuba.
27. Finalização simulada em dinheiro preserva as linhas no registro e payload WhatsApp.
28. Finalização simulada no cartão preserva as linhas e exige aviso/abertura em outra aba.
29. Finalização simulada em Pix preserva as linhas e exige instruções/confirmação de retorno.
30. Acompanhamento exibe as observações após leitura simulada do pedido, sem chaves React duplicadas.

Para testar o modo protegido, no PowerShell execute:

```powershell
$env:CR_TEST_ORDER_PROTECTION = 'true'
npm.cmd run test:ui -- --port 8083
```

Abra `http://127.0.0.1:8083/tests/ui-regression.html`. Esse modo roda os mesmos
30 cenários usando RPCs simuladas e mais sete: resposta perdida seguida de
recuperação após fechar a loja/sacola, RPC ausente sem fallback inseguro, clique
duplo, timeout, troca de conta, itens adicionados depois da tentativa original e
falha na reserva de notificação. Total: 37 cenários. A criação/reserva da chave
usa Web Locks quando disponível; os testes aguardam essa reserva antes de
verificar o resultado, sem simular um bloqueio síncrono que não existe no navegador.
Remova a variável de teste ao terminar: `Remove-Item Env:CR_TEST_ORDER_PROTECTION`.

Os testes SQL usam PostgreSQL descartável e não dependem de credenciais reais.
Procedimento e limitações em `supabase/ORDER_IDEMPOTENCY.md`. A configuração de
teste não ativa `VITE_ORDER_IDEMPOTENCY_ENABLED` no build de produção.

Esses testes não confirmam pagamento, autorização/RLS no servidor ou comunicação
real com n8n/Mercado Pago. Os dois cenários iniciais de retorno usam sacola vazia;
a recuperação do perfil usa uma sacola preenchida e flags simuladas. O cliente
Supabase e as requisições HTTP de perfil/sessão são simulados, inclusive a criação
recusada. Os temporizadores de 12 segundos são disparados pelo teste, sem espera
real. Logs dos erros provocados são esperados nesses cenários.

Os cenários de horário controlam o relógio e disparam os callbacks de 30 segundos
e eventos de retorno à aba. Os cenários do carrinho usam itens fictícios. Nos três
cenários de finalização, `orders.insert` devolve um pedido fictício e
`functions.invoke` captura somente o payload em memória; as implementações
originais da fixture são restauradas ao terminar. Nenhum pedido é gravado e
nenhuma mensagem é enviada a um serviço real. O acompanhamento também lê uma
resposta local simulada. `window.open` é interceptado para verificar o destino
de teste e `_blank`; nenhuma página de pagamento real é aberta. A verificação de
versão recebe a própria página de teste para não sair do ambiente de simulação.

A exceção de continuação usa indicadores locais do fluxo existente, não uma
confirmação bancária. Os testes não comprovam pagamento nem validação do pedido
no servidor. A atualização de horário usa a grade já carregada; alterações da
grade no painel administrativo não são sincronizadas em tempo real nesta etapa.

A homologação completa da finalização do pedido e do pagamento na página externa
com uma conta de teste continua necessária antes da publicação.

Os testes não fazem parte da entrada de produção do Vite e não usam dados de clientes.

Metadados recebidos em Markdown foram preservados em `order-schema.received.json`.
`node tests/build-received-schema-fixture.mjs` gera `order-schema.received.fixture.sql`
com as colunas, políticas e grants exportados. Essa fixture só pode ser executada
em banco descartável novo. O segundo export (`order-dependencies.received.json`)
completa profiles/get_my_role, grants da sequência e constraints: a fixture atual
reproduz 37 colunas, 17 políticas e 10 constraints. Auth/usuários são fictícios e
triggers de profiles não foram exportados. O limite bigint arredondado no export
é substituído por NO MAXVALUE na sequência local; nenhum valor atual é copiado.

Executar fixture, `order-legacy-compatibility.sql`, migração,
`order-legacy-compatibility.sql` novamente e `order-idempotency.sql`, nessa ordem,
com `psql -v ON_ERROR_STOP=1`. O teste de compatibilidade usa authenticated e
ROLLBACK para conferir perfil/RLS, INSERT antigo sem chave, número e cupom antes
e depois da migração. Depois, executar `order-concurrent.sql` em duas conexões:
uma deve criar/reservar e outra recuperar/retornar false. Os totais devem ser
2 pedidos, 2 usos do cupom TESTE e 2 reservas, somando o teste sequencial.
Esses testes passaram com os dois exports. O ensaio remoto informado pelo usuário
terminou em ROLLBACK; não constitui aplicação permanente da migração.

## Diagnóstico da API instalada

Posteriormente o usuário aplicou a migração definitiva e enviou nove verificações
de estrutura/permissões OK. `node tests/check-order-api.mjs` verifica a negação
das RPCs sem login na API configurada em .env (usa a rede, sem imprimir a chave).
Foi executado e recebeu HTTP 401 / 42501 nas duas funções.

Para a conferência autenticada sem criar pedidos, iniciar:

```powershell
npm.cmd run dev -- --config tests/vite.api-check.config.mjs
```

Abrir `http://127.0.0.1:8084/tests/order-api-check.html` e usar uma conta comum de
cliente. As duas chamadas de pedido/reserva usam ID nulo. O diagnóstico lê o
papel por get_my_role, espera recusa da criação e false na reserva, e encerra
somente sua própria sessão de login. Não salva a sessão no navegador, não lê
pedidos e não chama notificações ou pagamento. Esperado: cinco linhas OK.
A verificação não comprova criação pela API nem o pagamento externo.
O usuário deve fazer o login na página; não compartilhar credenciais na conversa.

`node --test tests/order-api-probe.test.mjs` passou nos quatro cenários locais:
payloads nulos/anônimo, caminhos autenticados, rejeição de conta administrativa
e detecção de RPC inexistente. A página foi conferida no navegador antes do login.
Os arquivos do diagnóstico ficam em tests e não entram na página de produção.

O usuário realizou o login real no diagnóstico; os cinco resultados OK foram
conferidos no navegador. Isso valida acesso autenticado nos caminhos sem gravação,
não a criação efetiva pela API. Também passou a compilação isolada com
VITE_ORDER_IDEMPOTENCY_ENABLED=true em `dist/order-protection-preview`, sem
alterar .env ou publicar. Ela usa o Supabase de produção configurado; não é
ambiente isolado para criar pedidos fictícios. Validação final de criação e
pagamentos continua pendente.

## Integração com API e PostgreSQL locais

`order-api.compose.yml` cria PostgreSQL 15 e PostgREST 14.5 com os metadados
recebidos e a migração. A rede é interna, sem portas publicadas, e o banco usa
tmpfs. O runner usa somente o executável Node da imagem n8nio/n8n já disponível;
não inicia n8n, não monta seus dados e não altera outros projetos Docker.
O único arquivo montado no runner é o teste empacotado, sem .env ou credenciais
de produção. JWTs e clientes são fictícios. Não há serviços de mensagens/pagamento.

Com as imagens já instaladas:

```powershell
node tests/build-received-schema-fixture.mjs
node tests/build-order-api-test.mjs
docker compose -p cr-sushi-order-api -f tests/order-api.compose.yml up -d --pull never --wait --wait-timeout 45
docker compose -p cr-sushi-order-api -f tests/order-api.compose.yml run --rm --no-deps runner
docker compose -p cr-sushi-order-api -f tests/order-api.compose.yml down
```

O teste exige um marcador exclusivo do banco descartável antes de gravar. Usa
o SDK Supabase instalado no projeto, a rotina real createOrderSubmitter e chamadas
HTTP ao PostgREST. O transporte só aceita REST no endereço local fixo, bloqueando
rotas de auth/functions e destinos externos. A API aplica JWT/roles/RLS; reservas
são gravadas na tabela local, mas a entrega de mensagens é capturada em memória.

Passaram oito cenários: JWT/recusa anônima; criação/repetição/novo pedido para cada
valor cash, pix e card; resposta perdida após COMMIT e retomada por outra instância;
envios simultâneos com uma reserva/um cupom; rollback em falha de cupom; isolamento
entre clientes. Observações e dados originais foram preservados. O teste importa
a rotina TypeScript do aplicativo no bundle, sem duplicar sua implementação.

Os nomes de pagamento verificam persistência do campo, não cobrança bancária ou
abertura de pop-ups: a interface tem os cenários de navegador já descritos acima.
Não é homologação de uma transação real no Mercado Pago/Pix. Banco, API e rede
descartáveis foram removidos ao concluir os testes.

Configuração e JWT foram conferidos na documentação do PostgREST 14:
[configuração](https://docs.postgrest.org/en/v14/references/configuration.html) e
[autenticação](https://docs.postgrest.org/en/v14/references/auth.html).

## Conferência visual dos pagamentos — executada

```powershell
npm.cmd run dev -- --config tests/vite.payment-flow.config.mjs
```

Abrir `http://127.0.0.1:8086/tests/payment-flow-check.html`. A configuração liga
a proteção somente nesse servidor, substitui o cliente Supabase pela fixture
que bloqueia escritas e usa CSP sem conexão externa. Não carrega dados reais.
O Cart, os modais e os estilos são os do aplicativo; os dados, a chave Pix e o
destino de cartão são de teste. A nova aba é aberta pelo window.open original,
sem interceptação, para `payment-tab.html` (página local, não Mercado Pago).

Conferido com cliques no navegador e inspeção visual: dinheiro exige escolha
de troco e rejeita valor menor que o pedido; Pix mostra instruções/total/chave
e bloqueia finalização até o aviso; ao recarregar e reabrir a sacola, mostra a
confirmação Pix; cartão mostra seu aviso e abre uma segunda aba de verdade.
No retorno do cartão, a finalização chegou ao bloqueio intencional da fixture
(uma tentativa bloqueada, zero gravações), preservou a tentativa e exibiu
“Verificar pedido anterior”, sem abrir uma segunda aba de pagamento.

Não houve alteração nos componentes de pagamento. A inspeção visual do modal
Pix confirmou sua apresentação sobre a sacola. O cenário foi reiniciado ao fim
e a aba externa de teste foi fechada. A página permanece disponível para revisão.
Essa conferência testa a interface; não verifica disponibilidade do link comercial
ou uma transação financeira no provedor externo.
