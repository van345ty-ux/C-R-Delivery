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
      } else if (project_type === 'nail-designer') {
        targetWebhookUrl = Deno.env.get('N8N_NAIL_DESIGNER_WEBHOOK_URL') || 'https://achronychous-anabelle-transstellar.ngrok-free.dev/webhook/nail-designer';
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
    // ROTA 2: ENTRADA (Evolution API -> Edge Function -> n8n PIX)
    // ==========================================
    // Agora encaminhamos as mensagens que chegam da Evolution API 
    // direto para o seu workflow do PIX no n8n.
    
    console.log('[INCOMING] Webhook recebido da Evolution API. Encaminhando para n8n PIX.');

    // Lê a nova Secret. Se não achar, usa a URL do ngrok como fallback (como garantia).
    const pixWebhookUrl = Deno.env.get('N8N_PIX_WEBHOOK_URL') || 'https://achronychous-anabelle-transstellar.ngrok-free.dev/webhook/pix-academias';

    const n8nIncomingResponse = await fetch(pixWebhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestPayload),
    });

    if (!n8nIncomingResponse.ok) {
      const errorText = await n8nIncomingResponse.text();
      console.error('n8n PIX Webhook failed:', n8nIncomingResponse.status, errorText);
      return new Response(JSON.stringify({ error: `Falha ao enviar para o n8n PIX com status ${n8nIncomingResponse.status}` }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true, message: 'Webhook forwarded to PIX successfully.' }), {
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