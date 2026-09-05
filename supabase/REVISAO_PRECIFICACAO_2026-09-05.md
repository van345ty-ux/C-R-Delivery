# Fase 1D — validação de preço, cupom e disponibilidade no servidor

Estado: fluxo do aplicativo mapeado e diagnóstico de produção analisado.
Nenhuma alteração de banco/frontend aplicada nesta fase.

## Comportamento atual confirmado no código

O carrinho calcula subtotal com `item.product.price * quantity`, desconto percentual
sobre o subtotal e soma a taxa de entrega. O payload enviado a submit_order_once
contém os itens com seus preços, total, delivery_fee e coupon_used fornecidos pelo
navegador. O servidor atual verifica usuário e correspondência ID/código do cupom,
mas ainda não recalcula preços, taxa ou desconto e não verifica active, aprovação,
validade e limite no momento final.

O campo product_id do item é opcional no tipo histórico do pedido. O carrinho atual
o envia. Produtos promocionais mostram campos auxiliares, mas o preço efetivamente
colocado no carrinho e persistido é `product.price`. O diagnóstico de produção
confirmou esse campo como `numeric(10,2)` obrigatório e sem valores inválidos.

As taxas vêm das chaves settings.delivery_fee e comandatuba_delivery_fee. A escolha
entre elas depende de `selectedCity`, mas a cidade ainda não faz parte do pedido.
Na campanha do Dia dos Namorados a entrega pode ser grátis, exceto Comandatuba,
com base em uma configuração que pode mudar enquanto o cliente está pagando.

## Restrição dos pagamentos

No cartão, o cliente confirma um aviso, abre o link do Mercado Pago em outra aba e
volta ao carrinho para finalizar. No Pix, recebe chave/total, sai para pagar e volta
para confirmar antes do pedido. Portanto, rejeitar somente no INSERT porque preço,
taxa ou cupom mudou pode deixar o cliente após uma tentativa de pagamento sem pedido.

A direção segura é uma cotação/reserva autenticada antes de iniciar Pix/cartão:
o servidor lê produtos/cupom/configurações, calcula e fixa os valores por prazo
curto e reserva capacidade do cupom. Ao voltar, a confirmação cria o pedido a partir
da cotação idempotente. Dinheiro pode preparar e confirmar em sequência. Reservas
abandonadas precisam expirar sem consumir uso definitivo. Isso ainda é desenho,
não implementação; depende do diagnóstico real e de testes de retorno/expiração.

## Diagnóstico de produção

`AUDITAR_PRECIFICACAO_PEDIDOS.sql` abre transação READ ONLY / REPEATABLE READ com
timeout de 15 segundos. Não consulta clientes nem pedidos e não chama funções.
Retorna oito seções: tabelas; colunas; restrições/índices; políticas/grants;
gatilhos/funções relacionadas; catálogo público reduzido; cidades; somente as
configurações delivery_fee, comandatuba_delivery_fee e valentine_theme_active;
e verificações de integridade. Omite chave Pix, links, imagens e descrições.

O resultado coletado em 5 de setembro de 2026 confirmou:

- PostgreSQL 17.4, transação somente leitura e isolamento repeatable read;
- 49 produtos, sendo 34 disponíveis, sem preço nulo/negativo e sem ID duplicado;
- taxa comum de R$ 4,00 e taxa de Comandatuba de R$ 8,00, ambas numéricas;
- campanha de entrega grátis desligada (`valentine_theme_active = false`);
- Una ativa; Comandatuba e Arataca inativas no momento da coleta;
- RLS ativo em products, settings, cities, coupons e orders;
- somente o gatilho esperado `count_coupon_on_order_insert` ligado a orders.

Há nomes repetidos entre produtos de IDs/categorias diferentes (por exemplo,
produto comum e promoção). Isso não é inconsistência: a futura cotação deve usar
o UUID, nunca o nome, como identidade do item.

O diagnóstico também identificou permissões antigas amplas na camada de grants,
políticas sobrepostas em products e duas funções de geração de cupom de aniversário.
Como o RLS continua ativo, esses achados não serão misturados à precificação sem
uma verificação própria. Nenhum deles foi alterado nesta fase.

## Homologação local concluída

A fundação e a confirmação foram instaladas e verificadas no Supabase. A integração
do frontend permanece controlada por `VITE_ORDER_QUOTE_ENABLED` e exige também a
proteção idempotente já existente. Em localhost foram aprovados:

- Pix: cotação antes da chave, saída e retorno com finalização liberada;
- cartão: cotação antes da abertura do Mercado Pago em outra aba e retorno normal;
- dinheiro: pedido com dois produtos, taxa e troco corretos no painel;
- cupom individual 10% com limite 1: total R$ 55,30 para subtotal R$ 57,00 e taxa
  R$ 4,00; contador 1/1 e segunda utilização recusada.

TypeScript, ESLint e 35 testes automatizados passaram. O próximo passo é gerar a
prévia de publicação com as duas flags habilitadas no ambiente da Vercel, revisar
os mesmos caminhos sem pagamento real e somente então promover para produção.
