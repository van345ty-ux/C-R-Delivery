\set ON_ERROR_STOP on
UPDATE public.coupons SET usage_limit=1, usage_count=0 WHERE code='TESTE';
SET ROLE authenticated;
SET request.jwt.claim.sub='00000000-0000-4000-8000-000000000001';

DO $test$
DECLARE q jsonb; first_result jsonb; replay jsonb; created_order jsonb;
BEGIN
  q := public.prepare_order_quote(
    '50000000-0000-4000-8000-000000000001',
    '[{"product_id":"10000000-0000-4000-8000-000000000001","quantity":2,"price":0.01}]',
    'delivery','cash','Una','00000000-0000-4000-8000-000000000010');
  first_result := public.submit_quoted_order_once(
    '50000000-0000-4000-8000-000000000001',
    '{"items":[],"total":0.01,"delivery_fee":999,"delivery_type":"pickup","payment_method":"pix","address":" Rua 1 ","customer_name":"Cliente","customer_phone":"73999999999"}');
  created_order := first_result->'order';
  IF first_result->>'created' <> 'true'
     OR created_order->>'total' <> '106.60'
     OR created_order->>'delivery_fee' <> '4.00'
     OR created_order->>'delivery_type' <> 'delivery'
     OR created_order->>'payment_method' <> 'cash'
     OR created_order#>>'{items,0,price}' <> '57.00'
     OR created_order->>'coupon_used' <> 'TESTE' THEN
    RAISE EXCEPTION 'Pedido nao respeitou a cotacao: %', first_result;
  END IF;
  replay := public.submit_quoted_order_once(
    '50000000-0000-4000-8000-000000000001', '{}');
  IF replay->>'created' <> 'false' OR replay->'order' <> created_order THEN
    RAISE EXCEPTION 'Confirmacao repetida nao foi idempotente';
  END IF;
END;
$test$;
RESET ROLE;

DO $checks$
BEGIN
  IF (SELECT usage_count FROM public.coupons WHERE code='TESTE') <> 1 THEN
    RAISE EXCEPTION 'Cupom nao foi contado exatamente uma vez';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.order_quotes
      WHERE id='50000000-0000-4000-8000-000000000001' AND consumed_at IS NOT NULL) THEN
    RAISE EXCEPTION 'Reserva nao foi consumida';
  END IF;
  IF (SELECT count(*) FROM public.orders
      WHERE client_request_id='50000000-0000-4000-8000-000000000001') <> 1 THEN
    RAISE EXCEPTION 'Quantidade de pedidos incorreta';
  END IF;
  IF has_function_privilege('anon','public.submit_quoted_order_once(uuid,jsonb)','EXECUTE')
     OR NOT has_function_privilege('authenticated','public.submit_quoted_order_once(uuid,jsonb)','EXECUTE') THEN
    RAISE EXCEPTION 'Permissoes incorretas';
  END IF;
END;
$checks$;

SELECT 'Confirmacao idempotente, valores autoritativos e cupom unico: OK';
