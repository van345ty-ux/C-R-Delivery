import { serve } from "https://deno.land/std@0.190.0/http/server.ts"

// Headers CORS obrigatórios (embora esta função seja chamada internamente pelo DB, é bom manter)
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Obter o segredo do Webhook do n8n
    const N8N_WEBHOOK_URL = Deno.env.get('N8N_WEBHOOK_URL');

    if (!N8N_WEBHOOK_URL) {
      return new Response(JSON.stringify({ error: 'N8N_WEBHOOK_URL secret not configured.' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // O payload virá do trigger do banco de dados
    const { record } = await req.json();

    if (!record || !record.order_number || !record.customer_phone || !record.status) {
      return new Response(JSON.stringify({ error: 'Missing required order data in payload.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Payload a ser enviado para o n8n
    const n8nPayload = {
      workflow_type: 'order_status_update', // Novo tipo de workflow para o n8n
      phone_number: record.customer_phone,
      message_data: {
        order_number: `C&R${record.order_number.toString().padStart(2, '0')}`,
        customer_name: record.customer_name,
        new_status: record.status,
        delivery_type: record.delivery_type,
      }
    };

    console.log(`Forwarding status update for order ${n8nPayload.message_data.order_number} to n8n.`);

    // Encaminhar o payload para o Webhook do n8n
    const n8nResponse = await fetch(N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(n8nPayload),
    });

    if (!n8nResponse.ok) {
      const errorText = await n8nResponse.text();
      console.error('n8n Webhook failed:', n8nResponse.status, errorText);
      return new Response(JSON.stringify({ error: `n8n Webhook failed with status ${n8nResponse.status}` }), {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true, message: 'Status update forwarded to n8n.' }), {
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Edge Function Error:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});