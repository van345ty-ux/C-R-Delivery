\set ON_ERROR_STOP on
BEGIN;
SET ROLE authenticated;
SET request.jwt.claim.sub = '00000000-0000-4000-8000-000000000001';
SELECT public.submit_order_once('20000000-0000-4000-8000-000000000001',
  '{"user_id":"00000000-0000-4000-8000-000000000001","items":[],"total":30,"delivery_fee":0,"delivery_type":"pickup","payment_method":"cash","status":"Pedido recebido","customer_name":"Concorrência","customer_phone":"","coupon_used":"TESTE"}',
  '00000000-0000-4000-8000-000000000010')->>'created' AS created \gset
SELECT public.claim_order_notification('20000000-0000-4000-8000-000000000001') AS claimed \gset
SELECT pg_sleep(1);
COMMIT;
\echo Inseriu: :created / Reservou envio: :claimed
