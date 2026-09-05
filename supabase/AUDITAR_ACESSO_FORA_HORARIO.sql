-- Diagnostico somente leitura para acesso de clientes fora do horario normal.
-- Nao retorna nomes, e-mails, telefones, enderecos ou datas de nascimento.
BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY;
SET LOCAL statement_timeout = '15s';

WITH tabelas_alvo AS (
  SELECT c.oid,c.relname,c.relrowsecurity,c.relforcerowsecurity,c.relowner,c.relacl
  FROM pg_class c
  JOIN pg_namespace n ON n.oid=c.relnamespace
  WHERE n.nspname='public' AND c.relkind IN ('r','p')
    AND c.relname IN ('profiles','settings','operating_hours')
), secoes AS (
  SELECT 1 AS ordem,'01_contexto'::text AS secao,jsonb_build_object(
    'somente_leitura',current_setting('transaction_read_only'),
    'observacao','Sem dados pessoais e sem alteracoes no banco.'
  ) AS resultado

  UNION ALL

  SELECT 2,'02_tabelas',coalesce(jsonb_agg(jsonb_build_object(
    'tabela',t.relname,
    'proprietario',pg_get_userbyid(t.relowner),
    'rls',t.relrowsecurity,
    'rls_forcado',t.relforcerowsecurity,
    'colunas',(SELECT jsonb_agg(jsonb_build_object(
      'nome',a.attname,'tipo',format_type(a.atttypid,a.atttypmod),
      'obrigatoria',a.attnotnull,'padrao',pg_get_expr(d.adbin,d.adrelid)
    ) ORDER BY a.attnum)
      FROM pg_attribute a LEFT JOIN pg_attrdef d ON d.adrelid=a.attrelid AND d.adnum=a.attnum
      WHERE a.attrelid=t.oid AND a.attnum>0 AND NOT a.attisdropped),
    'restricoes',(SELECT coalesce(jsonb_agg(jsonb_build_object(
      'nome',con.conname,'tipo',con.contype,'definicao',pg_get_constraintdef(con.oid,true)
    ) ORDER BY con.conname),'[]'::jsonb) FROM pg_constraint con WHERE con.conrelid=t.oid)
  ) ORDER BY t.relname),'[]'::jsonb)
  FROM tabelas_alvo t

  UNION ALL

  SELECT 3,'03_politicas',coalesce(jsonb_agg(jsonb_build_object(
    'tabela',tablename,'nome',policyname,'comando',cmd,'papeis',roles,
    'usando',qual,'validacao',with_check
  ) ORDER BY tablename,policyname),'[]'::jsonb)
  FROM pg_policies
  WHERE schemaname='public' AND tablename IN ('profiles','settings','operating_hours')

  UNION ALL

  SELECT 4,'04_permissoes_tabelas',coalesce(jsonb_agg(jsonb_build_object(
    'tabela',t.relname,
    'anon',jsonb_build_object(
      'select',has_table_privilege('anon',t.oid,'SELECT'),
      'insert',has_table_privilege('anon',t.oid,'INSERT'),
      'update',has_table_privilege('anon',t.oid,'UPDATE'),
      'delete',has_table_privilege('anon',t.oid,'DELETE')),
    'authenticated',jsonb_build_object(
      'select',has_table_privilege('authenticated',t.oid,'SELECT'),
      'insert',has_table_privilege('authenticated',t.oid,'INSERT'),
      'update',has_table_privilege('authenticated',t.oid,'UPDATE'),
      'delete',has_table_privilege('authenticated',t.oid,'DELETE')),
    'service_role',jsonb_build_object(
      'select',has_table_privilege('service_role',t.oid,'SELECT'),
      'insert',has_table_privilege('service_role',t.oid,'INSERT'),
      'update',has_table_privilege('service_role',t.oid,'UPDATE'),
      'delete',has_table_privilege('service_role',t.oid,'DELETE'))
  ) ORDER BY t.relname),'[]'::jsonb)
  FROM tabelas_alvo t

  UNION ALL

  SELECT 5,'05_funcoes_relevantes',coalesce(jsonb_agg(jsonb_build_object(
    'assinatura',p.oid::regprocedure::text,
    'proprietario',pg_get_userbyid(p.proowner),
    'security_definer',p.prosecdef,
    'configuracao',p.proconfig,
    'hash_corpo_normalizado',md5(replace(p.prosrc,E'\r\n',E'\n')),
    'definicao',pg_get_functiondef(p.oid),
    'execucao_anon',has_function_privilege('anon',p.oid,'EXECUTE'),
    'execucao_authenticated',has_function_privilege('authenticated',p.oid,'EXECUTE'),
    'execucao_service_role',has_function_privilege('service_role',p.oid,'EXECUTE')
  ) ORDER BY p.proname,p.oid::regprocedure::text),'[]'::jsonb)
  FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
  WHERE n.nspname='public' AND p.proname IN ('prepare_order_quote','submit_quoted_order_once','get_my_role')

  UNION ALL

  SELECT 6,'06_resumo_sem_dados_pessoais',jsonb_build_object(
    'clientes_cadastrados',(SELECT count(*) FROM public.profiles WHERE role='customer'),
    'dias_configurados',(SELECT count(*) FROM public.operating_hours),
    'dias_ativos',(SELECT count(*) FROM public.operating_hours WHERE is_open IS TRUE),
    'chaves_configuracao_relacionadas',coalesce((SELECT jsonb_agg(key ORDER BY key)
      FROM public.settings WHERE key LIKE 'after_hours_access%'),'[]'::jsonb),
    'extensao_pgcrypto',EXISTS(SELECT 1 FROM pg_extension WHERE extname='pgcrypto')
  )
)
SELECT secao,resultado FROM secoes ORDER BY ordem;

COMMIT;
