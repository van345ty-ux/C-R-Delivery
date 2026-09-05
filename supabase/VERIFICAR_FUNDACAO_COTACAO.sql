-- Verificacao somente leitura da fase 1D-A.
BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY;
SET LOCAL statement_timeout = '15s';

WITH verificacoes(ordem, verificacao, ok) AS (
  VALUES
  (1, '01_tabela_com_rls', EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' AND c.relname='order_quotes' AND c.relkind='r'
      AND c.relrowsecurity AND NOT c.relforcerowsecurity
      AND pg_get_userbyid(c.relowner)='postgres')),
  (2, '02_colunas_e_restricoes',
    (SELECT count(*)=17 FROM information_schema.columns
      WHERE table_schema='public' AND table_name='order_quotes')
    AND (SELECT count(*) >= 8 FROM pg_constraint
      WHERE conrelid='public.order_quotes'::regclass)),
  (3, '03_indices_ativos',
    EXISTS (SELECT 1 FROM pg_index WHERE indexrelid=to_regclass('public.order_quotes_pkey')
      AND indisunique AND indisvalid AND indisready)
    AND EXISTS (SELECT 1 FROM pg_index WHERE indexrelid=to_regclass('public.order_quotes_live_coupon_idx')
      AND indisvalid AND indisready)
    AND EXISTS (SELECT 1 FROM pg_index WHERE indexrelid=to_regclass('public.order_quotes_user_created_idx')
      AND indisvalid AND indisready)),
  (4, '04_sem_acesso_direto_cliente',
    NOT has_table_privilege('anon','public.order_quotes','SELECT')
    AND NOT has_table_privilege('authenticated','public.order_quotes','SELECT')
    AND NOT has_table_privilege('anon','public.order_quotes','INSERT')
    AND NOT has_table_privilege('authenticated','public.order_quotes','INSERT')),
  (5, '05_funcao_protegida', EXISTS (
    SELECT 1 FROM pg_proc
    WHERE oid='public.prepare_order_quote(uuid,jsonb,text,text,text,uuid)'::regprocedure
      AND prosecdef AND proconfig=ARRAY['search_path=""']
      AND pg_get_userbyid(proowner)='postgres')),
  (6, '06_execucao_somente_autenticado',
    NOT has_function_privilege('anon','public.prepare_order_quote(uuid,jsonb,text,text,text,uuid)','EXECUTE')
    AND has_function_privilege('authenticated','public.prepare_order_quote(uuid,jsonb,text,text,text,uuid)','EXECUTE')),
  (7, '07_nenhuma_cotacao_inesperada',
    (SELECT count(*)=0 FROM public.order_quotes)),
  (8, '08_fluxo_anterior_preservado',
    md5(replace(pg_get_functiondef('public.submit_order_once(uuid,jsonb,uuid)'::regprocedure), E'\r\n', E'\n'))
      = 'e6ad398b86262a9dea3ab58071fb1b04'
    AND (SELECT md5(replace(prosrc, E'\r\n', E'\n'))
         FROM pg_proc WHERE oid='public.count_coupon_on_order_insert()'::regprocedure)
      = 'b1e058a9431cef0e6f8102476f10326a')
)
SELECT verificacao, CASE WHEN ok THEN 'OK' ELSE 'REVISAR' END AS resultado
FROM verificacoes ORDER BY ordem;

COMMIT;
