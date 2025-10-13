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
    // 2. Obter o segredo do Webhook do n8n
    const N8N_WEBHOOK_URL = Deno.env.get('N8N_WEBHOOK_URL');

    if (!N8N_WEBHOOK_URL) {
      return new Response(JSON.stringify({ error: 'N8N_WEBHOOK_URL secret not configured.' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 3. Obter o payload completo da requisição (incluindo workflow_type e message_data)
    const requestPayload = await req.json();

    if (!requestPayload.workflow_type || !requestPayload.phone_number || !requestPayload.message_data) {
      return new Response(JSON.stringify({ error: 'Missing required fields: workflow_type, phone_number, message_data' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Routing request for workflow_type: ${requestPayload.workflow_type} to n8n.`);

    // 4. Encaminhar o payload completo para o Webhook do n8n
    const n8nResponse = await fetch(N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestPayload),
    });

    // 5. Retornar o status do n8n (ou um sucesso genérico)
    if (!n8nResponse.ok) {
      const errorText = await n8nResponse.text();
      console.error('n8n Webhook failed:', n8nResponse.status, errorText);
      return new Response(JSON.stringify({ error: `n8n Webhook failed with status ${n8nResponse.status}` }), {
        status: 502, // Bad Gateway
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // O n8n geralmente retorna um 200/204. Retornamos sucesso para o cliente.
    return new Response(JSON.stringify({ success: true, message: 'Request forwarded to n8n successfully.' }), {
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