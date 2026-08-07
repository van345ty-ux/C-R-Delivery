# WhatsApp Router - Edge Function Supabase

Este documento serve como **guia de contexto para agentes de IA** e desenvolvedores sobre o propósito e funcionamento da Edge Function `whatsapp-router`.

## 📌 Objetivo Principal
Atuar como um **API Gateway / Roteador Centralizador** entre a **Evolution API** (que gerencia as instâncias de WhatsApp) e o **n8n** (que roda os fluxos de automação). 

Ao invés de configurar múltiplos webhooks na Evolution API, configura-se apenas o endpoint desta Edge Function. A função lê a requisição e a redireciona para o fluxo correto do n8n, facilitando a manutenção e a troca de domínios.

---

## ⚙️ Arquitetura de Roteamento

A função lida nativamente com as requisições OPTIONS (CORS) e processa requisições POST dividindo-as em duas rotas principais:

### 1. Rota 1: Saída (Notificações CR Sushi -> n8n)
Processa disparos e notificações baseadas no parâmetro `project_type` recebido no payload.

**Regras de Roteamento:**
- `project_type === 'delivery'`: Encaminha para o webhook de Notificação de Pedidos do CR Sushi.
- `project_type === 'marketing'`: Encaminha para o webhook de Disparo de Campanhas.
- `project_type === 'nail-designer'` ou `'nail_scheduler'`: Encaminha para o webhook do Estúdio de Unhas.

> **⚠️ Injeção de Instância (CRÍTICO):** 
> Antes de encaminhar a requisição para o n8n, a função **injeta a propriedade** `evo_instance: 'C7R'` no payload. 
> Isso é vital para garantir que o n8n saiba qual sessão/chip de WhatsApp da Evolution API utilizar ao responder o cliente.

### 2. Rota 2: Entrada (Evolution API -> Edge Function -> n8n PIX)
Lida com webhooks genéricos vindos da Evolution API (geralmente notificações de mensagens de clientes ou PIX).
O tráfego desta rota é encaminhado diretamente para o webhook centralizador de PIX no n8n.

---

## 🔗 Variáveis de Ambiente e URLs
As URLs de destino no n8n estão configuradas para ler variáveis de ambiente do Deno (`Deno.env.get`), mas **possuem fallback hardcoded** no código para segurança. 

O domínio oficial atual do n8n é: `https://n8n.studionailart.space`

As chaves esperadas são:
- `N8N_DELIVERY_WEBHOOK_URL`
- `N8N_MARKETING_WEBHOOK_URL`
- `N8N_NAIL_DESIGNER_WEBHOOK_URL`
- `N8N_PIX_WEBHOOK_URL`

## 🛠️ Como usar como Agente (Instrução Sistêmica)
- **Modificações de Fluxo**: Se um novo negócio ou sistema for adicionado à empresa, a nova regra deve ser criada dentro do bloco `if (project_type)` na **Rota 1**, e a nova URL do n8n correspondente deve ser adicionada.
- **Mudança de Servidor**: Se o servidor do n8n mudar de domínio no futuro, basta um "Replace All" no domínio hardcoded neste arquivo (`index.ts`) e o deploy da Edge Function para atualizar todos os sistemas da empresa de uma vez.
- **Deploy**: Lembre-se que alterações locais no `index.ts` requerem o deploy para a nuvem via `supabase functions deploy whatsapp-router` para entrarem em vigor.
