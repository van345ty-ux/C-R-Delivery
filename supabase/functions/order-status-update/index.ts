import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

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
    // 1. Inicializar o cliente Supabase Service Role
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Obter o segredo do Webhook do n8n (Usando N8N_DELIVERY_WEBHOOK_URL para consistência)
    const N8N_WEBHOOK_URL = Deno.env.get('N8N_DELIVERY_WEBHOOK_URL');

    if (!N8N_WEBHOOK_URL) {
      return new Response(JSON.stringify({ error: 'N8N_DELIVERY_WEBHOOK_URL secret not configured.' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // O payload virá do trigger do banco de dados (contém o ID e o novo status)
    const { record } = await req.json();

    if (!record || !record.id || !record.customer_phone || !record.status) {
      return new Response(JSON.stringify({ error: 'Missing required order data in payload from DB trigger.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 2. Buscar os detalhes completos do pedido usando o Service Role Key
    const { data: fullOrder, error: fetchError } = await supabase
      .from('orders')
      .select('id, order_number, customer_name, customer_phone, items, total, delivery_fee, delivery_type, payment_method, address, status')
      .eq('id', record.id)
      .single();

    if (fetchError || !fullOrder) {
      console.error('Error fetching full order details:', fetchError);
      return new Response(JSON.stringify({ error: 'Failed to fetch full order details.' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 3. Payload a ser enviado para o n8n (agora com todos os detalhes)
    const n8nPayload = {
      workflow_type: 'order_status_update',
      phone_number: fullOrder.customer_phone,
      message_data: {
        order_id: fullOrder.id,
        order_number: `C&R${fullOrder.order_number.toString().padStart(2, '0')}`,
        customer_name: fullOrder.customer_name,
        new_status: fullOrder.status,
        delivery_type: fullOrder.delivery_type,
        // Campos adicionais solicitados:
        items: fullOrder.items,
        total: fullOrder.total,
        delivery_fee: fullOrder.delivery_fee,
        payment_method: fullOrder.payment_method,
        address: fullOrder.address,
      }
    };

    console.log(`Forwarding status update for order ${n8nPayload.message_data.order_number} to n8n with full details.`);

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