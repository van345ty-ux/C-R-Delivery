import { supabase } from '../integrations/supabase/client';
import type { CartItem } from '../types';

export const orderQuoteEnabled = import.meta.env.VITE_ORDER_QUOTE_ENABLED === 'true';

export interface OrderQuote {
  id: string;
  user_id: string;
  items: Array<{ product_id: string; name: string; quantity: number; price: number; observations?: string }>;
  subtotal: number;
  delivery_fee: number;
  discount_amount: number;
  total: number;
  delivery_type: 'delivery' | 'pickup';
  payment_method: 'pix' | 'card' | 'cash';
  city_name: string | null;
  coupon_id: string | null;
  coupon_code: string | null;
  expires_at: string;
}

export async function prepareOrderQuote(input: {
  requestId: string;
  items: CartItem[];
  deliveryType: 'delivery' | 'pickup';
  paymentMethod: 'pix' | 'card' | 'cash';
  cityName: string;
  couponId?: string;
}, signal?: AbortSignal): Promise<OrderQuote> {
  const request = supabase.rpc('prepare_order_quote_with_access', {
    p_request_id: input.requestId,
    p_items: input.items.map(item => ({
      product_id: item.product.id,
      quantity: item.quantity,
      observations: item.observations || null,
    })),
    p_delivery_type: input.deliveryType,
    p_payment_method: input.paymentMethod,
    p_city_name: input.cityName,
    p_coupon_id: input.couponId || null,
  });
  const { data, error } = signal ? await request.abortSignal(signal) : await request;
  if (error) throw error;
  if (!data?.quote?.id) throw new Error('O servidor não retornou a cotação.');
  return data.quote as OrderQuote;
}
