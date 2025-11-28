# Configuração de Variáveis de Ambiente do Supabase

Para que as Edge Functions do Supabase possam se comunicar com o seu workflow do n8n, a URL de produção do webhook deve ser configurada como um segredo (secret) no painel do Supabase.

## Variável Necessária

| Nome da Variável | Valor | Descrição |
| :--- | :--- | :--- |
| `N8N_WEBHOOK_URL` | `https://primary-production-d411.up.railway.app/webhook/whatsapp-order-notification` | URL de produção do webhook do n8n para receber notificações de pedidos. |

## Instruções de Configuração

1.  Acesse o Painel do Supabase.
2.  Navegue até **Edge Functions**.
3.  Clique em **Manage Secrets** (Gerenciar Segredos).
4.  Adicione um novo segredo com o nome `N8N_WEBHOOK_URL` e o valor fornecido acima.
5.  Salve as alterações.

**Atenção:** As Edge Functions `whatsapp-router` e `order-status-update` dependem desta variável para funcionar corretamente.