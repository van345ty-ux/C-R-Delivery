import { serve } from "https://deno.land/std@0.190.0/http/server.ts"

// Headers CORS obrigatórios
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Função para enviar a mensagem real para a API do WhatsApp
async function sendWhatsappMessage(apiUrl: string, apiToken: string, payload: any) {
  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiToken}`, // Usando o token da API do WhatsApp
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`WhatsApp API failed: ${response.status} - ${errorText}`);
  }

  return response.json();
}

serve(async (req) => {
  // 1. Lidar com OPTIONS (CORS)
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // 2. Obter segredos da API do WhatsApp
    const WHATSAPP_API_URL = Deno.env.get('WHATSAPP_API_URL');
    const WHATSAPP_API_TOKEN = Deno.env.get('WHATSAPP_API_TOKEN');

    if (!WHATSAPP_API_URL || !WHATSAPP_API_TOKEN) {
      return new Response(JSON.stringify({ error: 'WhatsApp API secrets not configured.' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 3. Obter dados da requisição
    const { workflow_type, phone_number, message_data } = await req.json();

    if (!workflow_type || !phone_number || !message_data) {
      return new Response(JSON.stringify({ error: 'Missing required fields: workflow_type, phone_number, message_data' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let whatsappPayload: any;
    let logMessage: string;

    // 4. Roteamento e Construção da Mensagem
    switch (workflow_type) {
      case 'delivery_order':
        logMessage = `Processing Delivery Order for ${phone_number}`;
        // Exemplo de construção de payload para Delivery
        whatsappPayload = {
          to: phone_number,
          text: `Novo Pedido C&R Sushi! Total: R$ ${message_data.total}. Itens: ${message_data.items.join(', ')}`,
          // Adicione outros campos específicos da sua API de WhatsApp aqui
        };
        break;

      case 'nail_appointment':
        logMessage = `Processing Nail Appointment for ${phone_number}`;
        // Exemplo de construção de payload para Agendamento Nail
        whatsappPayload = {
          to: phone_number,
          text: `Agendamento Confirmado! Serviço: ${message_data.service}. Data: ${message_data.date}`,
        };
        break;

      case 'finance_agent':
        logMessage = `Processing Finance Agent lead for ${phone_number}`;
        // Exemplo de construção de payload para Agente de Finanças
        whatsappPayload = {
          to: phone_number,
          text: `Novo Lead de Finanças! Nome: ${message_data.name}. Interesse: ${message_data.interest}`,
        };
        break;

      default:
        return new Response(JSON.stringify({ error: `Unknown workflow type: ${workflow_type}` }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    console.log(logMessage);

    // 5. Enviar mensagem via API do WhatsApp
    const result = await sendWhatsappMessage(WHATSAPP_API_URL, WHATSAPP_API_TOKEN, whatsappPayload);

    // 6. Retornar sucesso
    return new Response(JSON.stringify({ success: true, result }), {
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