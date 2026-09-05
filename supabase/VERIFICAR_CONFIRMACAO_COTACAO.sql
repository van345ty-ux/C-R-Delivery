-- Verificacao somente leitura da fase 1D-B.
BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY;
SET LOCAL statement_timeout='15s';

WITH checks(ordem, verificacao, ok) AS (
 VALUES
 (1,'01_funcao_confirmacao_protegida', EXISTS (
   SELECT 1 FROM pg_proc WHERE oid='public.submit_quoted_order_once(uuid,jsonb)'::regprocedure
    AND prosecdef AND proconfig=ARRAY['search_path=""'] AND pg_get_userbyid(proowner)='postgres')),
 (2,'02_execucao_somente_autenticado',
   NOT has_function_privilege('anon','public.submit_quoted_order_once(uuid,jsonb)','EXECUTE')
   AND has_function_privilege('authenticated','public.submit_quoted_order_once(uuid,jsonb)','EXECUTE')),
 (3,'03_gatilho_pedido_ativo', EXISTS (
   SELECT 1 FROM pg_trigger WHERE tgrelid='public.orders'::regclass
    AND tgname='count_coupon_on_order_insert' AND tgenabled='O' AND tgtype=5
    AND tgfoid='public.count_coupon_on_order_insert()'::regprocedure)),
 (4,'04_contagem_por_cotacao_e_legado', EXISTS (
   SELECT 1 FROM pg_proc WHERE oid='public.count_coupon_on_order_insert()'::regprocedure
    AND prosecdef AND proconfig=ARRAY['search_path=""']
    AND prosrc LIKE '%FROM public.order_quotes%'
    AND prosrc LIKE '%coalesce(usage_count, 0) + 1%'
    AND prosrc LIKE '%WHERE code = NEW.coupon_used%')),
 (5,'05_confirmacao_autoritativa', EXISTS (
   SELECT 1 FROM pg_proc WHERE oid='public.submit_quoted_order_once(uuid,jsonb)'::regprocedure
    AND prosrc LIKE '%v_quote.items%'
    AND prosrc LIKE '%v_quote.total%'
    AND prosrc LIKE '%v_quote.delivery_fee%'
    AND prosrc LIKE '%v_quote.payment_method%'
    AND prosrc LIKE '%consumed_at = clock_timestamp()%')),
 (6,'06_funcao_anterior_preservada',
   md5(replace(pg_get_functiondef('public.submit_order_once(uuid,jsonb,uuid)'::regprocedure),E'\r\n',E'\n'))
    ='e6ad398b86262a9dea3ab58071fb1b04'),
 (7,'07_nenhuma_cotacao_inesperada',(SELECT count(*)=0 FROM public.order_quotes)),
 (8,'08_rls_e_acesso_direto_preservados',
   (SELECT relrowsecurity FROM pg_class WHERE oid='public.order_quotes'::regclass)
   AND NOT has_table_privilege('anon','public.order_quotes','SELECT')
   AND NOT has_table_privilege('authenticated','public.order_quotes','SELECT'))
)
SELECT verificacao,CASE WHEN ok THEN 'OK' ELSE 'REVISAR' END AS resultado
FROM checks ORDER BY ordem;
COMMIT;
