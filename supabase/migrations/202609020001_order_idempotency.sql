-- Aplicar primeiro em homologação após conferir as tabelas/políticas existentes.
-- Não altera as políticas de orders nem recalcula preços: essa revisão é separada.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';

-- Compatibilidade com a definição fornecida pelo usuário: a função antiga é
-- SECURITY DEFINER e usa UPDATE coupons sem schema. Mantém assinatura, cálculo,
-- proprietário e grants; qualifica a tabela para funcionar com search_path vazio.
CREATE OR REPLACE FUNCTION public.increment_coupon_usage(p_coupon_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  UPDATE public.coupons
  SET usage_count = usage_count + 1
  WHERE id = p_coupon_id;
END;
$$;

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS client_request_id uuid;
CREATE UNIQUE INDEX IF NOT EXISTS orders_client_request_id_key ON public.orders (client_request_id);

CREATE TABLE IF NOT EXISTS public.order_notification_claims (
  request_id uuid PRIMARY KEY REFERENCES public.orders(client_request_id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id),
  claimed_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.order_notification_claims ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.order_notification_claims FROM anon, authenticated;
GRANT SELECT, INSERT ON public.order_notification_claims TO authenticated;
DROP POLICY IF EXISTS order_notification_claims_select_own ON public.order_notification_claims;
CREATE POLICY order_notification_claims_select_own ON public.order_notification_claims
  FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()));
DROP POLICY IF EXISTS order_notification_claims_insert_own ON public.order_notification_claims;
CREATE POLICY order_notification_claims_insert_own ON public.order_notification_claims
  FOR INSERT TO authenticated WITH CHECK (
    user_id = (SELECT auth.uid()) AND EXISTS (
      SELECT 1 FROM public.orders o WHERE o.client_request_id = request_id AND o.user_id = (SELECT auth.uid())
    )
  );

CREATE OR REPLACE FUNCTION public.submit_order_once(p_request_id uuid, p_order jsonb, p_coupon_id uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE
  v_order public.orders%ROWTYPE;
  v_input public.orders%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL OR p_request_id IS NULL THEN
    RAISE EXCEPTION 'Authenticated user and request ID are required' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_order FROM public.orders
    WHERE client_request_id = p_request_id AND user_id = auth.uid();
  IF FOUND THEN RETURN jsonb_build_object('order', to_jsonb(v_order), 'created', false); END IF;

  v_input := jsonb_populate_record(NULL::public.orders, p_order);
  IF v_input.user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Order must belong to the authenticated user' USING ERRCODE = '42501';
  END IF;
  INSERT INTO public.orders (
    client_request_id, user_id, items, total, delivery_fee, delivery_type, payment_method,
    address, status, customer_name, customer_phone, coupon_used, change_for, sushi_egg_delivery_day
  ) VALUES (
    p_request_id, auth.uid(), v_input.items, v_input.total, v_input.delivery_fee, v_input.delivery_type,
    v_input.payment_method, v_input.address, v_input.status, v_input.customer_name,
    v_input.customer_phone, v_input.coupon_used, v_input.change_for, v_input.sushi_egg_delivery_day
  ) ON CONFLICT (client_request_id) DO NOTHING RETURNING * INTO v_order;

  IF FOUND THEN
    -- Só a inserção vencedora consome o cupom, na mesma transação do pedido.
    IF p_coupon_id IS NOT NULL THEN
      IF NOT EXISTS (SELECT 1 FROM public.coupons WHERE id = p_coupon_id AND code = v_input.coupon_used) THEN
        RAISE EXCEPTION 'Coupon does not match order' USING ERRCODE = '22023';
      END IF;
      PERFORM public.increment_coupon_usage(p_coupon_id);
    ELSIF v_input.coupon_used IS NOT NULL THEN
      RAISE EXCEPTION 'Coupon ID is required' USING ERRCODE = '22023';
    END IF;
    RETURN jsonb_build_object('order', to_jsonb(v_order), 'created', true);
  END IF;

  SELECT * INTO v_order FROM public.orders
    WHERE client_request_id = p_request_id AND user_id = auth.uid();
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Request is not accessible to this user' USING ERRCODE = '42501';
  END IF;
  RETURN jsonb_build_object('order', to_jsonb(v_order), 'created', false);
END;
$$;

-- Reserva única de envio, inclusive quando a resposta da criação se perde.
-- Não é fila de entrega: falha após a reserva exige reconciliação operacional.
CREATE OR REPLACE FUNCTION public.claim_order_notification(p_request_id uuid)
RETURNS boolean
LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;
  INSERT INTO public.order_notification_claims (request_id, user_id)
    SELECT client_request_id, user_id FROM public.orders
    WHERE client_request_id = p_request_id AND user_id = auth.uid()
    ON CONFLICT (request_id) DO NOTHING;
  RETURN FOUND;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_order_once(uuid, jsonb, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.claim_order_notification(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_order_once(uuid, jsonb, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_order_notification(uuid) TO authenticated;
NOTIFY pgrst, 'reload schema';
COMMIT;
