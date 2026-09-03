-- SOMENTE LEITURA: consulta metadados, sem alterar banco nem ler pedidos.
-- Executar todo o arquivo. Exportar as 7 linhas do resultado como CSV.
-- O texto nas células pode parecer cortado; o CSV preserva o conteúdo completo.
WITH colunas AS (
  SELECT table_name, column_name, data_type, udt_name, is_nullable, column_default, ordinal_position
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name IN ('orders', 'coupons', 'order_notification_claims')
), indices AS (
  SELECT tablename, indexname, indexdef FROM pg_indexes
  WHERE schemaname = 'public' AND tablename IN ('orders', 'order_notification_claims')
), politicas AS (
  SELECT schemaname, tablename, policyname, roles, cmd, qual, with_check FROM pg_policies
  WHERE schemaname = 'public' AND tablename IN ('orders', 'coupons', 'order_notification_claims')
), rls AS (
  SELECT c.relname, c.relrowsecurity, c.relforcerowsecurity
  FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relname IN ('orders', 'coupons', 'order_notification_claims')
), privilegios AS (
  SELECT grantee, table_name, privilege_type FROM information_schema.role_table_grants
  WHERE table_schema = 'public' AND table_name IN ('orders', 'coupons', 'order_notification_claims')
), funcoes AS (
  SELECT p.proname, pg_get_userbyid(p.proowner) AS owner, p.proacl AS privileges,
    has_function_privilege('anon', p.oid, 'EXECUTE') AS anon_can_execute,
    has_function_privilege('authenticated', p.oid, 'EXECUTE') AS authenticated_can_execute,
    pg_get_function_identity_arguments(p.oid) AS arguments, pg_get_functiondef(p.oid) AS definition
  FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND p.proname IN ('increment_coupon_usage', 'submit_order_once', 'claim_order_notification')
), gatilhos AS (
  SELECT tgname, pg_get_triggerdef(oid) AS definition FROM pg_trigger
  WHERE tgrelid = to_regclass('public.orders') AND NOT tgisinternal
)
SELECT '01_colunas' AS secao, coalesce(jsonb_agg(to_jsonb(colunas) ORDER BY table_name, ordinal_position), '[]'::jsonb) AS resultado FROM colunas
UNION ALL
SELECT '02_indices', coalesce(jsonb_agg(to_jsonb(indices) ORDER BY tablename, indexname), '[]'::jsonb) FROM indices
UNION ALL
SELECT '03_politicas', coalesce(jsonb_agg(to_jsonb(politicas) ORDER BY tablename, policyname), '[]'::jsonb) FROM politicas
UNION ALL
SELECT '04_rls', coalesce(jsonb_agg(to_jsonb(rls) ORDER BY relname), '[]'::jsonb) FROM rls
UNION ALL
SELECT '05_privilegios', coalesce(jsonb_agg(to_jsonb(privilegios) ORDER BY table_name, grantee, privilege_type), '[]'::jsonb) FROM privilegios
UNION ALL
SELECT '06_funcoes', coalesce(jsonb_agg(to_jsonb(funcoes) ORDER BY proname, arguments), '[]'::jsonb) FROM funcoes
UNION ALL
SELECT '07_gatilhos', coalesce(jsonb_agg(to_jsonb(gatilhos) ORDER BY tgname), '[]'::jsonb) FROM gatilhos
ORDER BY secao;
