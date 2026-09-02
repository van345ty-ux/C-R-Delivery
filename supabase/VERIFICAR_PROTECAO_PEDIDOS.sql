-- SOMENTE LEITURA de metadados. Não lê pedidos nem executa as funções de negócio.
-- Executar inteiro após a migração. Esperado: todas as linhas com resultado OK.
-- Isto confere instalação/permissões; não substitui testes da API e da interface.
WITH funcoes_esperadas (nome, assinatura, retorno, security_definer) AS (
  VALUES
    ('submit_order_once', 'public.submit_order_once(uuid,jsonb,uuid)', 'jsonb', false),
    ('claim_order_notification', 'public.claim_order_notification(uuid)', 'boolean', false),
    ('increment_coupon_usage', 'public.increment_coupon_usage(uuid)', 'void', true)
), verificacoes AS (
  SELECT '01_coluna_opcional_uuid' AS verificacao, EXISTS (
    SELECT 1 FROM pg_attribute a
    WHERE a.attrelid = to_regclass('public.orders') AND a.attname = 'client_request_id'
      AND a.atttypid = 'uuid'::regtype AND NOT a.attnotnull AND NOT a.attisdropped
  ) AS ok
  UNION ALL
  SELECT '02_indice_unico_valido', EXISTS (
    SELECT 1 FROM pg_index i JOIN pg_attribute a
      ON a.attrelid = i.indrelid AND a.attnum = i.indkey[0]
    WHERE i.indexrelid = to_regclass('public.orders_client_request_id_key')
      AND i.indrelid = to_regclass('public.orders')
      AND i.indisunique AND i.indisvalid AND i.indisready AND i.indimmediate
      AND i.indnatts = 1 AND i.indpred IS NULL AND i.indexprs IS NULL
      AND a.attname = 'client_request_id'
  )
  UNION ALL
  SELECT '03_tabela_reservas_com_rls', EXISTS (
    SELECT 1 FROM pg_class c
    WHERE c.oid = to_regclass('public.order_notification_claims')
      AND c.relkind = 'r' AND c.relrowsecurity
      AND (SELECT count(*) FROM pg_attribute a WHERE a.attrelid = c.oid
        AND NOT a.attisdropped AND a.attnotnull
        AND ((a.attname IN ('request_id', 'user_id') AND a.atttypid = 'uuid'::regtype)
          OR (a.attname = 'claimed_at' AND a.atttypid = 'timestamptz'::regtype))) = 3
  )
  UNION ALL
  SELECT '04_chave_e_vinculos_reservas', (
    SELECT count(*) = 3 FROM pg_constraint c
    JOIN pg_attribute own_column ON own_column.attrelid = c.conrelid AND own_column.attnum = c.conkey[1]
    LEFT JOIN pg_attribute target_column ON target_column.attrelid = c.confrelid AND target_column.attnum = c.confkey[1]
    WHERE c.conrelid = to_regclass('public.order_notification_claims')
      AND c.convalidated AND cardinality(c.conkey) = 1 AND (
        (c.contype = 'p' AND own_column.attname = 'request_id')
        OR (c.contype = 'f' AND c.confrelid = to_regclass('public.orders')
          AND own_column.attname = 'request_id' AND target_column.attname = 'client_request_id'
          AND cardinality(c.confkey) = 1 AND c.confdeltype = 'c')
        OR (c.contype = 'f' AND c.confrelid = to_regclass('auth.users')
          AND own_column.attname = 'user_id' AND target_column.attname = 'id'
          AND cardinality(c.confkey) = 1 AND c.confdeltype = 'a')
      )
  )
  UNION ALL
  SELECT '05_politicas_reservas', (
    SELECT count(*) = 2 AND bool_and(
      p.roles = ARRAY['authenticated']::name[] AND (
        (p.policyname = 'order_notification_claims_select_own' AND p.cmd = 'SELECT' AND p.qual IS NOT NULL)
        OR (p.policyname = 'order_notification_claims_insert_own' AND p.cmd = 'INSERT' AND p.with_check IS NOT NULL)
      ))
    FROM pg_policies p WHERE p.schemaname = 'public' AND p.tablename = 'order_notification_claims'
  )
  UNION ALL
  SELECT '06_permissoes_reservas', EXISTS (
    SELECT 1 FROM pg_class c WHERE c.oid = to_regclass('public.order_notification_claims')
      AND has_table_privilege('authenticated', c.oid, 'SELECT')
      AND has_table_privilege('authenticated', c.oid, 'INSERT')
      AND NOT has_table_privilege('authenticated', c.oid, 'UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
      AND NOT has_table_privilege('anon', c.oid, 'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
  )
  UNION ALL
  SELECT '07_funcao_' || e.nome, EXISTS (
    SELECT 1 FROM pg_proc p WHERE p.oid = to_regprocedure(e.assinatura)
      AND p.prosecdef = e.security_definer AND p.prorettype = to_regtype(e.retorno)
      AND EXISTS (SELECT 1 FROM unnest(p.proconfig) setting WHERE setting IN ('search_path=', 'search_path=""'))
      AND has_function_privilege('authenticated', p.oid, 'EXECUTE')
      AND (e.security_definer OR NOT has_function_privilege('anon', p.oid, 'EXECUTE'))
      AND (e.security_definer OR NOT EXISTS (
        SELECT 1 FROM aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a
        WHERE a.grantee = 0 AND a.privilege_type = 'EXECUTE'
      ))
  ) FROM funcoes_esperadas e
)
SELECT verificacao, CASE WHEN ok THEN 'OK' ELSE 'REVISAR' END AS resultado
FROM verificacoes ORDER BY verificacao;
