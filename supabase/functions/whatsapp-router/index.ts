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

    // 3. Obter o payload completo da requisição
    const requestPayload = await req.json();
    const { project_type } = requestPayload;

    if (!project_type) {
      return new Response(JSON.stringify({ error: 'Missing required field: project_type' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 4. Determinar qual a URL de Destino baseada no project_type
    let targetWebhookUrl = '';

    if (project_type === 'delivery') {
      targetWebhookUrl = Deno.env.get('N8N_DELIVERY_WEBHOOK_URL') || 'https://15.228.227.120.sslip.io/webhook/whatsapp-order-notification';
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

    // 5. Injetar a informação da instância no payload recebido
    // Para que o n8n ou a api final saiba qual instância usar
    const payloadToSend = {
      ...requestPayload,
      evo_instance: EVO_INSTANCE_NAME
    };

    console.log(`Routing request for project_type: '${project_type}' to: ${targetWebhookUrl} with instance: '${EVO_INSTANCE_NAME}'`);

    // 6. Encaminhar o payload
    const n8nResponse = await fetch(targetWebhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payloadToSend),
    });

    // 6. Retornar o status da requisição
    if (!n8nResponse.ok) {
      const errorText = await n8nResponse.text();
      console.error('n8n Webhook failed:', n8nResponse.status, errorText);
      return new Response(JSON.stringify({ error: `n8n Webhook failed com status ${n8nResponse.status}` }), {
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