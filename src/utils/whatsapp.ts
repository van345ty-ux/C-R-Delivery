import { Order } from '../types';
import { supabase } from '../integrations/supabase/client';

export const sendWhatsappNotification = async (order: Order) => {
  const payload = {
    project_type: 'delivery',
    workflow_type: 'delivery_order',
    phone_number: order.customerPhone,
    message_data: {
      order_number: `C&R${order.orderNumber.toString().padStart(2, '0')}`,
      customer_name: order.customerName,
      total: order.total.toFixed(2),
      delivery_fee: order.deliveryFee.toFixed(2),
      delivery_type: order.deliveryType,
      payment_method: order.paymentMethod,
      address: order.address,
      status: order.status,
      items: order.items.map(item => ({
        name: item.product.name,
        quantity: item.quantity,
        price: item.product.price,
        observations: item.observations,
      })),
      change_for: order.changeFor,
    }
  };

  try {
    // Agora usa o whatsapp-router (Edge Function) como proxy para evitar erros SSL/CORS
    const { error } = await supabase.functions.invoke('whatsapp-router', {
      body: payload,
    });

    if (error) {
      console.error('Erro ao notificar n8n via Edge Function:', error);
      return false;
    }

    console.log('Notificação WhatsApp encaminhada com sucesso pelo roteador.');
    return true;

  } catch (error) {
    console.error('Erro ao notificar n8n:', error);
    return false;
  }
};