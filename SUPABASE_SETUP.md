# Configuração de Variáveis de Ambiente do Supabase

Para que as Edge Functions do Supabase possam se comunicar com o seu workflow do n8n, a URL de produção do webhook deve ser configurada como um segredo (secret) no painel do Supabase.

## Variável Necessária

| Nome da Variável | Valor Recomendado | Descrição |
| :--- | :--- | :--- |
| `N8N_DELIVERY_WEBHOOK_URL` | `https://n8n.meuapp-on.online/webhook/whatsapp-order-notification-V2` | Webhook principal para notificações de pedidos do delivery (CR Sushi). |
| `N8N_MARKETING_WEBHOOK_URL` | `https://n8n.meuapp-on.online/webhook/iniciar-campanha` | Webhook para disparo de campanhas de marketing. |
| `N8N_NAIL_DESIGNER_WEBHOOK_URL` | `https://n8n.meuapp-on.online/webhook/nail-designer` | Webhook para o fluxo de nail designer / agendamento. |
| `N8N_PIX_WEBHOOK_URL` | `https://n8n.meuapp-on.online/webhook/pix-academias` | Webhook para processamento de entrada de PIX / WhatsApp. |

## Instruções de Configuração

1. Acesse o Painel do Supabase.
2. Navegue até **Edge Functions** -> **Manage Secrets**.
3. Adicione ou edite os segredos com os nomes e valores da tabela acima.
4. Salve as alterações.