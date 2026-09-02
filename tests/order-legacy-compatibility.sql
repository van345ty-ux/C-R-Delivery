-- Apenas no PostgreSQL descartável. Executar antes e depois da migração.
\set ON_ERROR_STOP on
BEGIN;
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claim.sub = '00000000-0000-4000-8000-000000000001';
DO $$
DECLARE
  order_id uuid;
  number_created integer;
  usage_before integer;
  usage_after integer;
BEGIN
  IF public.get_my_role() IS DISTINCT FROM 'customer' THEN
    RAISE EXCEPTION 'Perfil de teste não reconhecido como cliente';
  END IF;
  IF (SELECT count(*) FROM public.profiles) <> 1 THEN
    RAISE EXCEPTION 'Leitura de perfil não respeitou a conta autenticada';
  END IF;
  SELECT usage_count INTO usage_before FROM public.coupons WHERE code = 'TESTE';
  INSERT INTO public.orders (user_id, items, total, delivery_fee, delivery_type,
    payment_method, status, customer_name, customer_phone, coupon_used)
  VALUES (auth.uid(), '[{"product_id":"combo","quantity":1,"observations":"sem molho"}]',
    27, 0, 'pickup', 'cash', 'Pedido recebido', 'Cliente fictício', '', 'TESTE')
  RETURNING id, order_number INTO order_id, number_created;
  IF order_id IS NULL OR number_created IS NULL THEN
    RAISE EXCEPTION 'Gravação antiga perdeu ID ou número do pedido';
  END IF;
  PERFORM public.increment_coupon_usage('00000000-0000-4000-8000-000000000010');
  SELECT usage_count INTO usage_after FROM public.coupons WHERE code = 'TESTE';
  IF usage_after IS DISTINCT FROM usage_before + 1 THEN
    RAISE EXCEPTION 'Contador do cupom incompatível com chamada antiga';
  END IF;
  RAISE NOTICE 'PASSOU: perfil/RLS, INSERT antigo sem chave, número automático e cupom';
END;
$$;
ROLLBACK;
