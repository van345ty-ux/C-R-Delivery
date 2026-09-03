\set ON_ERROR_STOP on
SET ROLE authenticated;
SET request.jwt.claim.sub = '00000000-0000-4000-8000-000000000001';
DO $$
DECLARE
  payload jsonb := '{"user_id":"00000000-0000-4000-8000-000000000001","items":[{"product_id":"combo","name":"Combo","quantity":1,"price":30,"observations":"sem cebola"},{"product_id":"combo","name":"Combo","quantity":1,"price":30,"observations":"sem molho"}],"total":54,"delivery_fee":0,"delivery_type":"pickup","payment_method":"cash","status":"Pedido recebido","customer_name":"Teste","customer_phone":"","coupon_used":"TESTE"}';
  first_result jsonb;
  replay jsonb;
  n integer;
BEGIN
  first_result := public.submit_order_once('10000000-0000-4000-8000-000000000001', payload, '00000000-0000-4000-8000-000000000010');
  replay := public.submit_order_once('10000000-0000-4000-8000-000000000001', payload || '{"total":1}', '00000000-0000-4000-8000-000000000010');
  IF first_result->>'created' <> 'true' OR replay->>'created' <> 'false' OR first_result->'order' IS DISTINCT FROM replay->'order' THEN
    RAISE EXCEPTION 'Falhou: repetição não recuperou o pedido original';
  END IF;
  SELECT usage_count INTO n FROM public.coupons WHERE code = 'TESTE';
  IF n <> 1 THEN RAISE EXCEPTION 'Falhou: consumo duplicado de cupom'; END IF;
  IF jsonb_array_length(replay->'order'->'items') <> 2 THEN RAISE EXCEPTION 'Falhou: perdeu observações'; END IF;
  IF NOT public.claim_order_notification('10000000-0000-4000-8000-000000000001') OR public.claim_order_notification('10000000-0000-4000-8000-000000000001') THEN
    RAISE EXCEPTION 'Falhou: notificação não foi reservada uma única vez';
  END IF;
  BEGIN
    PERFORM public.submit_order_once('10000000-0000-4000-8000-000000000002', payload || '{"coupon_used":"FALHA"}', '00000000-0000-4000-8000-000000000011');
    RAISE EXCEPTION 'Cupom deveria falhar';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM <> 'Falha simulada do cupom' THEN RAISE; END IF;
  END;
  IF EXISTS (SELECT 1 FROM public.orders WHERE client_request_id = '10000000-0000-4000-8000-000000000002') THEN
    RAISE EXCEPTION 'Falhou: pedido permaneceu após rollback do cupom';
  END IF;
  BEGIN
    PERFORM public.submit_order_once('10000000-0000-4000-8000-000000000003', payload || '{"user_id":"00000000-0000-4000-8000-000000000002"}', NULL);
    RAISE EXCEPTION 'Deveria rejeitar outro usuário';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  RAISE NOTICE 'PASSOU: repetição, cupom único, observações, notificação única, rollback e titularidade';
END;
$$;
SET request.jwt.claim.sub = '00000000-0000-4000-8000-000000000002';
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.orders) THEN RAISE EXCEPTION 'RLS expôs pedido alheio'; END IF;
  IF public.claim_order_notification('10000000-0000-4000-8000-000000000001') THEN RAISE EXCEPTION 'Reservou mensagem alheia'; END IF;
  BEGIN
    PERFORM public.submit_order_once('10000000-0000-4000-8000-000000000001', '{"user_id":"00000000-0000-4000-8000-000000000002","items":[],"total":1,"delivery_fee":0,"delivery_type":"pickup","payment_method":"cash","status":"Pedido recebido","customer_name":"Outro","customer_phone":""}', NULL);
    RAISE EXCEPTION 'Deveria rejeitar chave de outro usuário';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  RAISE NOTICE 'PASSOU: RLS e chave de outro usuário';
END;
$$;
RESET ROLE;
DO $$
BEGIN
  IF has_function_privilege('anon', 'public.submit_order_once(uuid,jsonb,uuid)', 'EXECUTE') THEN RAISE EXCEPTION 'Anon pode executar'; END IF;
  IF (SELECT prosecdef FROM pg_proc WHERE oid = 'public.submit_order_once(uuid,jsonb,uuid)'::regprocedure) THEN RAISE EXCEPTION 'Função contorna RLS'; END IF;
  RAISE NOTICE 'PASSOU: sem acesso anônimo ou elevação de privilégios';
END;
$$;
