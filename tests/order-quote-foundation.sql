\set ON_ERROR_STOP on
UPDATE public.coupons SET usage_limit = 1, usage_count = 0 WHERE code = 'TESTE';
SET ROLE authenticated;
SET request.jwt.claim.sub = '00000000-0000-4000-8000-000000000001';

DO $test$
DECLARE first_result jsonb; replay jsonb;
BEGIN
  SELECT public.prepare_order_quote(
    '30000000-0000-4000-8000-000000000001',
    '[{"product_id":"10000000-0000-4000-8000-000000000001","quantity":2,"price":0.01,"name":"ADULTERADO","observations":"sem molho"}]',
    'delivery', 'cash', 'Una', '00000000-0000-4000-8000-000000000010') INTO first_result;
  IF first_result->>'created' <> 'true'
     OR first_result#>>'{quote,subtotal}' <> '114.00'
     OR first_result#>>'{quote,delivery_fee}' <> '4.00'
     OR first_result#>>'{quote,discount_amount}' <> '11.40'
     OR first_result#>>'{quote,total}' <> '106.60'
     OR first_result#>>'{quote,items,0,name}' <> 'Combo Teste'
     OR first_result#>>'{quote,items,0,price}' <> '57.00' THEN
    RAISE EXCEPTION 'Cotacao nao usou os valores autoritativos: %', first_result;
  END IF;

  SELECT public.prepare_order_quote(
    '30000000-0000-4000-8000-000000000001', '[]',
    'pickup', 'pix', NULL, NULL) INTO replay;
  IF replay->>'created' <> 'false' OR replay->'quote' <> first_result->'quote' THEN
    RAISE EXCEPTION 'Repeticao nao foi idempotente';
  END IF;

  BEGIN
    PERFORM public.prepare_order_quote(
      '30000000-0000-4000-8000-000000000002',
      '[{"product_id":"10000000-0000-4000-8000-000000000001","quantity":1}]',
      'delivery', 'cash', 'Una', '00000000-0000-4000-8000-000000000010');
    RAISE EXCEPTION 'Segundo uso deveria ter sido recusado';
  EXCEPTION WHEN SQLSTATE '22023' THEN
    IF SQLERRM <> 'Coupon usage limit reached' THEN RAISE; END IF;
  END;

  BEGIN
    PERFORM public.prepare_order_quote(
      '30000000-0000-4000-8000-000000000003',
      '[{"product_id":"10000000-0000-4000-8000-000000000002","quantity":1}]',
      'pickup', 'cash', NULL, NULL);
    RAISE EXCEPTION 'Produto indisponivel deveria ter sido recusado';
  EXCEPTION WHEN SQLSTATE '22023' THEN
    IF SQLERRM <> 'Unavailable or invalid product' THEN RAISE; END IF;
  END;

END;
$test$;

RESET ROLE;
UPDATE public.order_quotes SET created_at = clock_timestamp() - interval '3 hours',
  expires_at = clock_timestamp() - interval '1 hour'
  WHERE id = '30000000-0000-4000-8000-000000000001';
SET ROLE authenticated;
SELECT public.prepare_order_quote(
  '30000000-0000-4000-8000-000000000004',
  '[{"product_id":"10000000-0000-4000-8000-000000000001","quantity":1}]',
  'pickup', 'card', NULL, '00000000-0000-4000-8000-000000000010');
RESET ROLE;
DO $security$
BEGIN
  IF has_function_privilege('anon', 'public.prepare_order_quote(uuid,jsonb,text,text,text,uuid)', 'EXECUTE')
     OR has_table_privilege('authenticated', 'public.order_quotes', 'SELECT') THEN
    RAISE EXCEPTION 'Permissao direta inesperada';
  END IF;
END;
$security$;

SELECT 'Ensaio da fundacao de cotacao concluido.';
