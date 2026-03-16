import { serve } from "https://deno.land/std@0.190.0/http/server.ts"

// Headers CORS obrigatórios
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // 1. Lidar com OPTIONS (CORS)
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // 2. Configurações
    // Cadastre aqui o nome da sua instância da Evolution (Evo)
    const EVO_INSTANCE_NAME = 'C7R';

    // 3. Obter o payload da requisição
    const requestPayload = await req.json();

    // ==========================================
    // ROTA 1: SAÍDA (Notificações CR Sushi -> n8n)
    // ==========================================
    if (requestPayload.project_type) {
      const { project_type } = requestPayload;
      let targetWebhookUrl = '';

      if (project_type === 'delivery') {
        targetWebhookUrl = Deno.env.get('N8N_DELIVERY_WEBHOOK_URL') || 'https://achronychous-anabelle-transstellar.ngrok-free.dev/webhook/whatsapp-order-notification-cr';
      } else if (project_type === 'marketing') {
        targetWebhookUrl = Deno.env.get('N8N_MARKETING_WEBHOOK_URL') || 'https://achronychous-anabelle-transstellar.ngrok-free.dev/webhook/iniciar-campanha';
      } else {
        const errorMsg = `Tipo de projeto não suportado: ${project_type}`;
        console.error(errorMsg);
        return new Response(JSON.stringify({ error: errorMsg }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Injetar a informação da instância no payload
      const finalPayload = {
        ...requestPayload,
        evo_instance: EVO_INSTANCE_NAME
      };

      console.log(`[OUTGOING] Routing request for project_type: '${project_type}' to: ${targetWebhookUrl}`);

      // Encaminhar para o n8n
      const n8nResponse = await fetch(targetWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(finalPayload),
      });

      if (!n8nResponse.ok) {
        const errorText = await n8nResponse.text();
        console.error('n8n Webhook failed:', n8nResponse.status, errorText);
        return new Response(JSON.stringify({ error: `n8n Webhook failed com status ${n8nResponse.status}` }), {
          status: 502,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ success: true, message: `Request for '${project_type}' forwarded successfully.` }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ==========================================
    // ROTA 2: ENTRADA (Evolution API -> Edge Function)
    // ==========================================
    // Se não tem project_type, assumimos que é um webhook vindo da Evolution API
    // (ex: o cliente mandou mensagem de volta, ou status de leitura).
    // Como você só tem workflows de disparo (marketing/delivery), 
    // nós apenas ignoramos e retornamos sucesso para a Evolution não dar erro.

    console.log('[INCOMING] Webhook recebido da Evolution API. Ignorando silenciosamente.');

    return new Response(JSON.stringify({ success: true, message: 'Webhook received and ignored.' }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Edge Function Error:', errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});