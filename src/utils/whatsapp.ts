import { Order } from '../types';

// URL da Edge Function que roteia para o n8n.
// Usando o ID do projeto C&R Sushi (lriqkvaxczvecwzvngqr) onde a função está hospedada.
const EDGE_FUNCTION_URL = "https://lriqkvaxczvecwzvngqr.supabase.co/functions/v1/whatsapp-router";

export const sendWhatsappNotification = async (order: Order) => {
  const payload = {
    project_type: 'delivery', // NOVO: Identificador do projeto para o roteador
    workflow_type: 'delivery_order', // Identificador para o n8n
    phone_number: order.customerPhone,
    message_data: {
      order_number: `C&R${order.orderNumber.toString().padStart(2, '0')}`,
      customer_name: order.customerName,
      total: order.total.toFixed(2),
      delivery_fee: order.deliveryFee.toFixed(2), // Adicionado deliveryFee
      delivery_type: order.deliveryType,
      payment_method: order.paymentMethod,
      address: order.address,
      status: order.status, // Adicionado o campo status aqui
      items: order.items.map(item => ({
        name: item.product.name,
        quantity: item.quantity,
        price: item.product.price,
        observations: item.observations,
      })),
    }
  };

  try {
    const response = await fetch(EDGE_FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('WhatsApp Router Error:', data.error || 'Unknown error');
      return false;
    }

    console.log('WhatsApp notification successfully routed to n8n:', data);
    return true;

  } catch (error) {
    console.error('Error invoking WhatsApp router Edge Function:', error);
    return false;
  }
};