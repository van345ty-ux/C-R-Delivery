-- FASE 1D: somente leitura. Executar o arquivo inteiro no SQL Editor.
-- Nao consulta clientes ou pedidos e nao executa funcoes de negocio.
-- O catalogo de produtos, cidades e as tres configuracoes abaixo ja sao dados
-- publicos usados pelo cardapio; chaves Pix, links e outras configuracoes sao omitidos.
BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY;
SET LOCAL statement_timeout = '15s';

WITH alvos AS (
  SELECT c.oid, n.nspname AS esquema, c.relname AS tabela, c.relkind AS tipo,
    pg_get_userbyid(c.relowner) AS proprietario, c.relrowsecurity AS rls,
    c.relforcerowsecurity AS rls_forcada, c.relacl::text AS acl
  FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relname IN
    ('products', 'settings', 'cities', 'coupons', 'orders', 'order_notification_claims')
    AND c.relkind IN ('r', 'p')
), colunas AS (
  SELECT a_t.tabela, a.attname AS coluna, format_type(a.atttypid, a.atttypmod) AS tipo,
    a.attnotnull AS obrigatoria, a.attidentity AS identidade, a.attgenerated AS gerada,
    pg_get_expr(d.adbin, d.adrelid) AS valor_padrao, a.attacl::text AS acl
  FROM alvos a_t JOIN pg_attribute a ON a.attrelid = a_t.oid
  LEFT JOIN pg_attrdef d ON d.adrelid = a.attrelid AND d.adnum = a.attnum
  WHERE a.attnum > 0 AND NOT a.attisdropped
), restricoes_indices AS (
  SELECT a_t.tabela, 'restricao' AS tipo, k.conname::text AS nome,
    k.convalidated AS valido, pg_get_constraintdef(k.oid) AS definicao
  FROM alvos a_t JOIN pg_constraint k ON k.conrelid = a_t.oid
  UNION ALL
  SELECT a_t.tabela, 'indice', i.relname::text, x.indisvalid AND x.indisready,
    pg_get_indexdef(x.indexrelid)
  FROM alvos a_t JOIN pg_index x ON x.indrelid = a_t.oid
  JOIN pg_class i ON i.oid = x.indexrelid
), gatilhos AS (
  SELECT t.oid, t.tgfoid, n.nspname AS esquema, c.relname AS tabela,
    t.tgname AS nome, t.tgenabled AS habilitado, pg_get_triggerdef(t.oid) AS definicao,
    pn.nspname AS esquema_funcao, p.proname AS funcao,
    pg_get_userbyid(p.proowner) AS proprietario_funcao, p.prosecdef AS security_definer,
    p.proconfig AS configuracao_funcao, md5(pg_get_functiondef(p.oid)) AS hash_funcao
  FROM pg_trigger t JOIN pg_class c ON c.oid = t.tgrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace
  JOIN pg_proc p ON p.oid = t.tgfoid JOIN pg_namespace pn ON pn.oid = p.pronamespace
  WHERE NOT t.tgisinternal AND t.tgrelid IN (SELECT oid FROM alvos)
), referencias_textuais AS (
  SELECT p.oid FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE p.prokind IN ('f', 'p') AND n.nspname NOT IN ('pg_catalog', 'information_schema')
    AND n.nspname NOT LIKE 'pg_toast%'
    AND p.prosrc ~* '\m(products|settings|cities|coupons|orders)\M'
), funcoes AS (
  SELECT n.nspname AS esquema, p.proname AS nome,
    pg_get_function_identity_arguments(p.oid) AS argumentos,
    pg_get_userbyid(p.proowner) AS proprietario, p.prosecdef AS security_definer,
    p.proconfig AS configuracao, p.proacl::text AS acl,
    has_function_privilege('anon', p.oid, 'EXECUTE') AS anon_execute,
    has_function_privilege('authenticated', p.oid, 'EXECUTE') AS authenticated_execute,
    has_function_privilege('service_role', p.oid, 'EXECUTE') AS service_execute,
    md5(pg_get_functiondef(p.oid)) AS hash_definicao,
    CASE WHEN n.nspname = 'public' AND p.proname IN
      ('submit_order_once', 'count_coupon_on_order_insert', 'increment_coupon_usage',
       'claim_order_notification', 'get_my_role')
      THEN pg_get_functiondef(p.oid) ELSE NULL END AS definicao_revisada
  FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE p.oid IN (SELECT oid FROM referencias_textuais)
     OR p.oid IN (SELECT tgfoid FROM gatilhos)
     OR (n.nspname = 'public' AND p.proname IN
       ('submit_order_once', 'count_coupon_on_order_insert', 'increment_coupon_usage',
        'claim_order_notification', 'get_my_role'))
), acessos AS (
  SELECT a_t.tabela, r.rolname AS papel, v.privilegio,
    has_table_privilege(r.oid, a_t.oid, v.privilegio) AS permitido
  FROM alvos a_t CROSS JOIN pg_roles r
  CROSS JOIN (VALUES ('SELECT'), ('INSERT'), ('UPDATE'), ('DELETE'),
                     ('TRUNCATE'), ('REFERENCES'), ('TRIGGER')) v(privilegio)
  WHERE r.rolname IN ('anon', 'authenticated', 'service_role')
), catalogo AS (
  SELECT id, name, price, original_price, promotional_price_single, category, available
  FROM public.products
), configuracoes_preco AS (
  SELECT key, value FROM public.settings
  WHERE key IN ('delivery_fee', 'comandatuba_delivery_fee', 'valentine_theme_active')
), cidades_publicas AS (
  SELECT id, name, active FROM public.cities
), integridade AS (
  SELECT jsonb_build_object(
    'produtos_total', (SELECT count(*) FROM catalogo),
    'produtos_disponiveis', (SELECT count(*) FROM catalogo WHERE available),
    'preco_nulo_ou_negativo', (SELECT count(*) FROM catalogo WHERE price IS NULL OR price < 0),
    'preco_promocional_negativo', (SELECT count(*) FROM catalogo WHERE promotional_price_single < 0),
    'id_duplicado', (SELECT count(*) FROM (SELECT id FROM catalogo GROUP BY id HAVING count(*) > 1) d),
    'configuracoes_preco_ausentes', ARRAY(
      SELECT k FROM unnest(ARRAY['delivery_fee', 'comandatuba_delivery_fee', 'valentine_theme_active']) k
      WHERE NOT EXISTS (SELECT 1 FROM configuracoes_preco s WHERE s.key = k) ORDER BY k),
    'taxas_nao_numericas', ARRAY(
      SELECT key FROM configuracoes_preco WHERE key IN ('delivery_fee', 'comandatuba_delivery_fee')
        AND value !~ '^[0-9]+([.][0-9]{1,2})?$' ORDER BY key),
    'tema_namorados_invalido', EXISTS (SELECT 1 FROM configuracoes_preco
      WHERE key = 'valentine_theme_active' AND value NOT IN ('true', 'false'))
  ) AS resultado
)
SELECT '01_contexto' AS secao, jsonb_build_object(
  'somente_leitura', current_setting('transaction_read_only'),
  'isolamento', current_setting('transaction_isolation'),
  'coletado_em', current_timestamp, 'versao', current_setting('server_version'),
  'observacao', 'Nao consulta clientes/pedidos; omite Pix, links, imagens e descricoes.'
) AS resultado
UNION ALL SELECT '02_tabelas', coalesce(jsonb_agg(to_jsonb(t) - 'oid' ORDER BY t.tabela), '[]'::jsonb) FROM alvos t
UNION ALL SELECT '03_colunas', coalesce(jsonb_agg(to_jsonb(c) ORDER BY c.tabela, c.coluna), '[]'::jsonb) FROM colunas c
UNION ALL SELECT '04_restricoes_indices', coalesce(jsonb_agg(to_jsonb(r) ORDER BY r.tabela, r.tipo, r.nome), '[]'::jsonb) FROM restricoes_indices r
UNION ALL SELECT '05_politicas_acessos', jsonb_build_object(
  'politicas', (SELECT coalesce(jsonb_agg(to_jsonb(p) ORDER BY p.tablename, p.policyname), '[]'::jsonb)
    FROM pg_policies p WHERE p.schemaname = 'public' AND p.tablename IN (SELECT tabela FROM alvos)),
  'acessos', (SELECT coalesce(jsonb_agg(to_jsonb(a) ORDER BY a.tabela, a.papel, a.privilegio), '[]'::jsonb) FROM acessos a))
UNION ALL SELECT '06_gatilhos_funcoes', jsonb_build_object(
  'gatilhos', (SELECT coalesce(jsonb_agg(to_jsonb(g) - 'oid' - 'tgfoid' ORDER BY g.esquema, g.tabela, g.nome), '[]'::jsonb) FROM gatilhos g),
  'funcoes', (SELECT coalesce(jsonb_agg(to_jsonb(f) ORDER BY f.esquema, f.nome, f.argumentos), '[]'::jsonb) FROM funcoes f))
UNION ALL SELECT '07_catalogo_publico', jsonb_build_object(
  'produtos', (SELECT coalesce(jsonb_agg(to_jsonb(c) ORDER BY c.id), '[]'::jsonb) FROM catalogo c),
  'cidades', (SELECT coalesce(jsonb_agg(to_jsonb(c) ORDER BY c.name, c.id), '[]'::jsonb) FROM cidades_publicas c),
  'configuracoes', (SELECT coalesce(jsonb_agg(to_jsonb(s) ORDER BY s.key), '[]'::jsonb) FROM configuracoes_preco s))
UNION ALL SELECT '08_integridade_catalogo', resultado FROM integridade
ORDER BY secao;

COMMIT;
