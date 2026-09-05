-- Fase 1D-B: confirma uma cotacao em pedido, ainda sem ativar o frontend.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';
LOCK TABLE public.orders, public.coupons, public.order_quotes IN SHARE ROW EXCLUSIVE MODE;

DO $preflight$
BEGIN
  IF to_regprocedure('public.submit_quoted_order_once(uuid,jsonb)') IS NOT NULL THEN
    RAISE EXCEPTION 'Confirmacao de cotacao ja existe; verificar em vez de reaplicar.';
  END IF;
  IF to_regclass('public.order_quotes') IS NULL
     OR to_regprocedure('public.prepare_order_quote(uuid,jsonb,text,text,text,uuid)') IS NULL
     OR to_regprocedure('public.submit_order_once(uuid,jsonb,uuid)') IS NULL
     OR to_regprocedure('public.count_coupon_on_order_insert()') IS NULL THEN
    RAISE EXCEPTION 'Fundacao ou fluxo atual obrigatorio ausente.';
  END IF;
  IF EXISTS (SELECT 1 FROM public.order_quotes) THEN
    RAISE EXCEPTION 'Existem cotacoes antes da ativacao; revisar antes de instalar a confirmacao.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_proc
      WHERE oid='public.count_coupon_on_order_insert()'::regprocedure
        AND prosecdef AND proconfig=ARRAY['search_path=""']
        AND pg_get_userbyid(proowner)='postgres'
        AND md5(replace(prosrc, E'\r\n', E'\n'))='b1e058a9431cef0e6f8102476f10326a') THEN
    RAISE EXCEPTION 'Gatilho de cupom diferente da fase 1C revisada.';
  END IF;
END;
$preflight$;

CREATE OR REPLACE FUNCTION public.count_coupon_on_order_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $count$
DECLARE v_quote_coupon_id uuid;
BEGIN
  IF TG_TABLE_SCHEMA <> 'public' OR TG_TABLE_NAME <> 'orders'
      OR TG_OP <> 'INSERT' OR TG_WHEN <> 'AFTER' OR TG_LEVEL <> 'ROW' THEN
    RAISE EXCEPTION 'Contagem permitida apenas na insercao de pedido.' USING ERRCODE = '42501';
  END IF;
  IF NEW.coupon_used IS NULL THEN RETURN NEW; END IF;

  SELECT coupon_id INTO v_quote_coupon_id FROM public.order_quotes
  WHERE id = NEW.client_request_id AND user_id = NEW.user_id
    AND coupon_code = NEW.coupon_used;

  IF v_quote_coupon_id IS NOT NULL THEN
    UPDATE public.coupons SET usage_count = coalesce(usage_count, 0) + 1
    WHERE id = v_quote_coupon_id;
  ELSE
    -- Compatibilidade dos pedidos criados pelo caminho anterior.
    UPDATE public.coupons SET usage_count = usage_count + 1
    WHERE code = NEW.coupon_used AND (user_id IS NULL OR user_id = NEW.user_id);
  END IF;
  RETURN NEW;
END;
$count$;
ALTER FUNCTION public.count_coupon_on_order_insert() OWNER TO postgres;
REVOKE ALL ON FUNCTION public.count_coupon_on_order_insert() FROM PUBLIC, anon, authenticated, service_role;

CREATE FUNCTION public.submit_quoted_order_once(p_quote_id uuid, p_order jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $submit$
DECLARE
  v_user_id uuid := auth.uid();
  v_quote public.order_quotes%ROWTYPE;
  v_input public.orders%ROWTYPE;
  v_order public.orders%ROWTYPE;
BEGIN
  IF v_user_id IS NULL OR p_quote_id IS NULL THEN
    RAISE EXCEPTION 'Authenticated user and quote ID are required' USING ERRCODE = '42501';
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_quote_id::text, 0));
  SELECT * INTO v_quote FROM public.order_quotes WHERE id = p_quote_id FOR UPDATE;
  IF NOT FOUND OR v_quote.user_id IS DISTINCT FROM v_user_id THEN
    RAISE EXCEPTION 'Quote is not accessible to this user' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_order FROM public.orders
    WHERE client_request_id = p_quote_id AND user_id = v_user_id;
  IF FOUND THEN
    RETURN jsonb_build_object('order', to_jsonb(v_order), 'created', false);
  END IF;

  IF v_quote.payment_method = 'cash' AND v_quote.expires_at <= clock_timestamp() THEN
    RAISE EXCEPTION 'Quote expired; request a new quote' USING ERRCODE = '22023';
  END IF;
  v_input := jsonb_populate_record(NULL::public.orders, p_order);
  IF v_quote.delivery_type = 'delivery' AND nullif(btrim(v_input.address), '') IS NULL THEN
    RAISE EXCEPTION 'Delivery address is required' USING ERRCODE = '22023';
  END IF;
  IF v_quote.payment_method <> 'cash' AND v_input.change_for IS NOT NULL THEN
    RAISE EXCEPTION 'Change is allowed only for cash' USING ERRCODE = '22023';
  END IF;
  IF v_quote.payment_method = 'cash' AND v_input.change_for IS NOT NULL
     AND v_input.change_for < v_quote.total THEN
    RAISE EXCEPTION 'Change amount is below the order total' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.orders (
    client_request_id, user_id, items, total, delivery_fee, delivery_type,
    payment_method, address, status, customer_name, customer_phone,
    coupon_used, change_for, sushi_egg_delivery_day
  ) VALUES (
    p_quote_id, v_user_id, v_quote.items, v_quote.total, v_quote.delivery_fee,
    v_quote.delivery_type, v_quote.payment_method,
    CASE WHEN v_quote.delivery_type='delivery' THEN btrim(v_input.address) ELSE NULL END,
    'Pedido recebido', v_input.customer_name, v_input.customer_phone,
    v_quote.coupon_code, v_input.change_for, v_input.sushi_egg_delivery_day
  ) RETURNING * INTO v_order;

  UPDATE public.order_quotes SET consumed_at = clock_timestamp()
  WHERE id = p_quote_id;
  RETURN jsonb_build_object('order', to_jsonb(v_order), 'created', true);
END;
$submit$;

ALTER FUNCTION public.submit_quoted_order_once(uuid,jsonb) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.submit_quoted_order_once(uuid,jsonb) FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.submit_quoted_order_once(uuid,jsonb) TO authenticated;

NOTIFY pgrst, 'reload schema';
COMMIT;
