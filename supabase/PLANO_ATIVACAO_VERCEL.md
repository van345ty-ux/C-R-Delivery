# Ativação da proteção — preparação da publicação

Site informado pelo usuário: https://cr-sushi.vercel.app/

## Estado confirmado

- A página publicada carregou a seleção de cidade do C&R Sushi.
- Entrada publicada: `/assets/index-C2aShScp.js`.
- SHA-256 da entrada: `74a34242237c197d7a798971f914dbdf20d8305e77ac076aa63f7b2ad2a1f1cb`.
- CSS publicado observado: `/assets/index-DWYoGt34.css`.
- A entrada contém a mesma URL Supabase configurada localmente. As chaves não foram impressas.
- A entrada não contém `submit_order_once` ou `claim_order_notification`.
- Origem Git local: `https://github.com/van345ty-ux/C-R-Delivery.git`, branch main.
- As alterações das etapas anteriores foram copiadas e verificadas por SHA-256 em um worktree separado, branch `codex/order-protection-preview`. A cópia preserva o trabalho original em main e exclui a alteração preexistente em `supabase/functions/whatsapp-router/index.ts` e arquivos temporários.
- Há vercel.json com cabeçalhos; não há .vercel/project.json ou CLI Vercel local/global.
- Acesso autenticado confirmado: projeto `c-r-delivery`, equipe `vanessas-projects-2c626a52`, ID `prj_rgZw92NWWBdXSZlMKT5BFUdPgSDg`.
- Produção e main remoto confirmados no commit `cd131d565f2c0bff35d3ac0958e8d2fec2a77766`.
- Implantação atual: https://vercel.com/vanessas-projects-2c626a52/c-r-delivery/4ZvRRVXZFqtjicJ6GrmfNNmsJZqU (Ready).
- Configuração conferida: Vite, saída dist, raiz do repositório, Node 22.x, instalação e build automáticos.

Banco de produção: migração aplicada pelo usuário; nove verificações OK.
API de produção: cinco verificações de acesso passaram com a conta de cliente.
Integração isolada: oito testes passaram com a rotina real e SDK, PostgreSQL e PostgREST.
Interface: controles de dinheiro/Pix/cartão e abertura real de aba local conferidos.
Build com flag ligada preparado em `dist/order-protection-preview`; não publicado.
Pagamentos e notificações reais não foram executados nos testes.

## Preparação da prévia

O usuário concluiu o acesso à Vercel. A flag não sensível
`VITE_ORDER_IDEMPOTENCY_ENABLED=true` foi preparada com escopo exclusivo
da branch `codex/order-protection-preview`, sem Production ou Development.
TypeScript e lint passaram novamente; 34 testes unitários passaram.
Próximo passo: enviar somente essa branch e verificar a implantação Preview.
Não fazer merge/push em main nem promover a versão sem revisão da prévia.

## Sequência de preparação e ativação

1. Confirmar o vínculo do projeto e a implantação atual no painel, em leitura.
2. Revisar a origem da próxima publicação: as alterações locais ainda não estão
   confirmadas no repositório remoto. Não fazer push em main como forma de teste,
   pois isso pode disparar a publicação automática.
3. Preparar uma publicação de prévia com o código revisado e a variável de build
   `VITE_ORDER_IDEMPOTENCY_ENABLED=true`. As configurações Supabase devem apontar
   para o projeto já verificado, sem imprimir credenciais. A prévia que usa esse
   banco não é ambiente isolado para gerar pedidos fictícios.
4. Conferir o artefato: saída do Vite com arquivos da aplicação, sem os bundles e
   páginas de testes. Usar somente a saída da compilação prevista; não publicar
   toda a pasta dist de trabalho, que também contém artefatos de testes locais.
5. Submeter a versão de prévia concreta à revisão antes da promoção para o domínio
   de produção. Mudanças de variável exigem nova compilação. Publicação/ativação
   em produção dependem da revisão da prévia e aprovação final do usuário.

## Reversão

Registrar a implantação anterior no painel. Se houver problema, avaliar a
reconciliação das tentativas em andamento antes de desativar a flag ou reverter
a versão: o fluxo antigo não recupera as novas tentativas pendentes. Não apagar
chaves pendentes, pedidos ou estruturas da migração para tentar resolver timeout.
Acompanhar criação e notificações separadamente; reserva não comprova entrega.
