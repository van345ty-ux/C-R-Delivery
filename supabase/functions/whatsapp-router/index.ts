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
    // 2. Obter os segredos de TODOS os Webhooks do n8n
    const DELIVERY_WEBHOOK_URL = Deno.env.get('N8N_DELIVERY_WEBHOOK_URL');
    const NAIL_WEBHOOK_URL = Deno.env.get('N8N_NAIL_WEBHOOK_URL');
    const PIZZARIA_WEBHOOK_URL = Deno.env.get('N8N_PIZZARIA_WEBHOOK_URL'); // <-- NOVO SEGREDO

    // 3. Obter o payload completo da requisição
    const requestPayload = await req.json();
    const { project_type } = requestPayload;

    if (!project_type) {
      return new Response(JSON.stringify({ error: 'Missing required field: project_type' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let targetWebhookUrl = '';

    // 4. Lógica de Roteamento ATUALIZADA
    if (project_type === 'delivery' && DELIVERY_WEBHOOK_URL) {
      targetWebhookUrl = DELIVERY_WEBHOOK_URL;
    } else if (project_type === 'nail_scheduler' && NAIL_WEBHOOK_URL) {
      targetWebhookUrl = NAIL_WEBHOOK_URL;
    } else if (project_type === 'pizzaria' && PIZZARIA_WEBHOOK_URL) { // <-- NOVA CONDIÇÃO
      targetWebhookUrl = PIZZARIA_WEBHOOK_URL;
    } else {
      return new Response(JSON.stringify({ error: `Webhook URL for project_type '${project_type}' is not configured.` }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Routing request for project_type: '${project_type}' to n8n.`);

    // 5. Encaminhar o payload (sem alterações nesta parte)
    const n8nResponse = await fetch(targetWebhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestPayload),
    });

    // 6. Retornar o status do n8n (sem alterações nesta parte)
    if (!n8nResponse.ok) {
      const errorText = await n8nResponse.text();
      console.error('n8n Webhook failed:', n8nResponse.status, errorText);
      return new Response(JSON.stringify({ error: `n8n Webhook failed with status ${n8nResponse.status}` }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true, message: `Request for '${project_type}' forwarded to n8n successfully.` }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Edge Function Error:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});