import { supabase } from '../integrations/supabase/client';
import { createOrderSubmitter, type SubmittedOrder } from './orderSubmission';
import { sendWhatsappNotification } from './whatsapp';

// Ativar apenas depois da migração e homologação das políticas do banco.
export const orderProtectionEnabled = import.meta.env.VITE_ORDER_IDEMPOTENCY_ENABLED === 'true';

export const protectedOrders = createOrderSubmitter({
  storage: localStorage,
  uuid: () => crypto.randomUUID(),
  reserve: (userId, work) => navigator.locks
    ? navigator.locks.request(`cr-sushi:order-reservation:${userId}`, work)
    : Promise.resolve(work()),
  submit: async (attempt, signal) => {
    const request = attempt.quoteId
      ? supabase.rpc('submit_quoted_order_once', {
          p_quote_id: attempt.quoteId, p_order: attempt.payload,
        })
      : supabase.rpc('submit_order_once', {
          p_request_id: attempt.requestId, p_order: attempt.payload, p_coupon_id: attempt.couponId,
        });
    const { data, error } = await request.abortSignal(signal);
    if (error) throw error;
    if (!data?.order) throw new Error('O servidor não retornou o pedido.');
    return data.order as SubmittedOrder;
  },
  claimNotification: async (requestId, signal) => {
    const { data, error } = await supabase.rpc('claim_order_notification', { p_request_id: requestId }).abortSignal(signal);
    if (error) throw error;
    return data === true;
  },
  notify: sendWhatsappNotification,
});
