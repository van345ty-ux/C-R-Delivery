-- SOMENTE LEITURA de estrutura e permissões. Não lê registros de clientes.
-- Não chama funções de negócio, não cria pedidos e não altera o banco.
-- Execute todo o arquivo e envie todas as linhas do resultado (CSV ou Markdown).
WITH perfil AS (
  SELECT jsonb_build_object(
    'colunas', (SELECT coalesce(jsonb_agg(to_jsonb(x) ORDER BY x.ordinal_position), '[]'::jsonb)
      FROM (SELECT column_name, data_type, udt_schema, udt_name, is_nullable,
                   column_default, ordinal_position
            FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = 'profiles') x),
    'indices', (SELECT coalesce(jsonb_agg(to_jsonb(x) ORDER BY x.indexname), '[]'::jsonb)
      FROM (SELECT indexname, indexdef FROM pg_indexes
            WHERE schemaname = 'public' AND tablename = 'profiles') x),
    'politicas', (SELECT coalesce(jsonb_agg(to_jsonb(x) ORDER BY x.policyname), '[]'::jsonb)
      FROM (SELECT policyname, roles, cmd, qual, with_check FROM pg_policies
            WHERE schemaname = 'public' AND tablename = 'profiles') x),
    'rls', (SELECT jsonb_build_object('enabled', c.relrowsecurity, 'forced', c.relforcerowsecurity)
      FROM pg_class c WHERE c.oid = to_regclass('public.profiles')),
    'grants', (SELECT coalesce(jsonb_agg(to_jsonb(x) ORDER BY x.grantee, x.privilege_type), '[]'::jsonb)
      FROM (SELECT grantee, privilege_type FROM information_schema.role_table_grants
            WHERE table_schema = 'public' AND table_name = 'profiles') x)
  ) AS resultado
), restricoes AS (
  SELECT c.conrelid::regclass::text AS tabela, c.conname AS nome,
         c.contype AS tipo, c.convalidated AS validada,
         pg_get_constraintdef(c.oid) AS definicao
  FROM pg_constraint c
  WHERE c.conrelid IN (to_regclass('public.orders'), to_regclass('public.coupons'),
                      to_regclass('public.profiles'))
), funcoes AS (
  SELECT p.proname AS nome, pg_get_function_identity_arguments(p.oid) AS argumentos,
         pg_get_userbyid(p.proowner) AS proprietario, p.proacl AS permissoes,
         p.proconfig AS configuracao, pg_get_functiondef(p.oid) AS definicao,
         has_function_privilege('authenticated', p.oid, 'EXECUTE') AS authenticated_execute
  FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND p.proname = 'get_my_role' AND p.prokind = 'f'
), sequencias AS (
  SELECT c.oid::regclass::text AS nome, pg_get_userbyid(c.relowner) AS proprietario,
         c.relacl AS permissoes, s.seqtypid::regtype::text AS tipo,
         s.seqincrement AS incremento, s.seqmin AS minimo, s.seqmax AS maximo,
         s.seqcache AS cache, s.seqcycle AS ciclo,
         has_sequence_privilege('authenticated', c.oid, 'USAGE') AS authenticated_usage,
         has_sequence_privilege('authenticated', c.oid, 'SELECT') AS authenticated_select,
         has_sequence_privilege('authenticated', c.oid, 'UPDATE') AS authenticated_update
  FROM pg_class c JOIN pg_sequence s ON s.seqrelid = c.oid
  WHERE c.oid = to_regclass('public.orders_order_number_seq')
     OR c.oid = to_regclass(pg_get_serial_sequence('public.orders', 'order_number'))
), gatilhos_cupom AS (
  SELECT t.tgname AS nome, t.tgenabled AS habilitado,
         pg_get_triggerdef(t.oid) AS definicao,
         pg_get_functiondef(t.tgfoid) AS funcao,
         pg_get_userbyid(p.proowner) AS proprietario_funcao
  FROM pg_trigger t JOIN pg_proc p ON p.oid = t.tgfoid
  WHERE t.tgrelid = to_regclass('public.coupons') AND NOT t.tgisinternal
), enums AS (
  SELECT n.nspname AS esquema, ty.typname AS tipo,
         e.enumlabel AS valor, e.enumsortorder AS ordem
  FROM pg_type ty JOIN pg_namespace n ON n.oid = ty.typnamespace
  JOIN pg_enum e ON e.enumtypid = ty.oid
  WHERE ty.oid IN (
    SELECT a.atttypid FROM pg_attribute a
    WHERE a.attrelid IN (to_regclass('public.profiles'), to_regclass('public.orders'),
                        to_regclass('public.coupons'))
      AND a.attnum > 0 AND NOT a.attisdropped
  )
), esquemas AS (
  SELECT n.nspname AS esquema,
         has_schema_privilege('authenticated', n.oid, 'USAGE') AS authenticated_usage
  FROM pg_namespace n WHERE n.nspname IN ('public', 'auth')
)
SELECT '01_profiles' AS secao, resultado FROM perfil
UNION ALL
SELECT '02_restricoes', coalesce(jsonb_agg(to_jsonb(restricoes) ORDER BY tabela, nome), '[]'::jsonb) FROM restricoes
UNION ALL
SELECT '03_get_my_role', coalesce(jsonb_agg(to_jsonb(funcoes) ORDER BY nome, argumentos), '[]'::jsonb) FROM funcoes
UNION ALL
SELECT '04_sequencia', coalesce(jsonb_agg(to_jsonb(sequencias) ORDER BY nome), '[]'::jsonb) FROM sequencias
UNION ALL
SELECT '05_gatilhos_cupom', coalesce(jsonb_agg(to_jsonb(gatilhos_cupom) ORDER BY nome), '[]'::jsonb) FROM gatilhos_cupom
UNION ALL
SELECT '06_enums', coalesce(jsonb_agg(to_jsonb(enums) ORDER BY esquema, tipo, ordem), '[]'::jsonb) FROM enums
UNION ALL
SELECT '07_acesso_esquemas', coalesce(jsonb_agg(to_jsonb(esquemas) ORDER BY esquema), '[]'::jsonb) FROM esquemas
ORDER BY secao;
