-- Diagnostico somente leitura. Nao executa funcoes nem altera cupons/agendamentos.
BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY;
SET LOCAL statement_timeout='15s';

SELECT '01_contexto' AS secao, jsonb_build_object(
  'somente_leitura', current_setting('transaction_read_only'),
  'coletado_em', clock_timestamp(),
  'observacao', 'Nao executa funcoes, nao le clientes e nao exibe comandos de agendamento.'
) AS resultado;

SELECT '02_funcoes' AS secao, coalesce(jsonb_agg(jsonb_build_object(
  'assinatura', p.oid::regprocedure::text,
  'proprietario', pg_get_userbyid(p.proowner),
  'security_definer', p.prosecdef,
  'configuracao', p.proconfig,
  'acl', p.proacl,
  'definicao', pg_get_functiondef(p.oid),
  'hash_corpo_normalizado', md5(replace(p.prosrc,E'\r\n',E'\n'))
) ORDER BY p.proname),'[]'::jsonb) AS resultado
FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE n.nspname='public' AND p.proname IN
  ('generate_birthday_coupons','generate_birthday_coupons_scheduled');

SELECT '03_permissoes_execucao' AS secao, jsonb_agg(jsonb_build_object(
  'assinatura', p.oid::regprocedure::text,
  'public', EXISTS (
    SELECT 1
    FROM aclexplode(coalesce(p.proacl, acldefault('f',p.proowner))) permissao
    WHERE permissao.grantee=0 AND permissao.privilege_type='EXECUTE'
  ),
  'anon', has_function_privilege('anon',p.oid,'EXECUTE'),
  'authenticated', has_function_privilege('authenticated',p.oid,'EXECUTE'),
  'service_role', has_function_privilege('service_role',p.oid,'EXECUTE')
) ORDER BY p.proname) AS resultado
FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE n.nspname='public' AND p.proname IN
  ('generate_birthday_coupons','generate_birthday_coupons_scheduled');

SELECT '04_referencias_internas' AS secao, coalesce(jsonb_agg(jsonb_build_object(
  'assinatura', p.oid::regprocedure::text,
  'security_definer',p.prosecdef,
  'proprietario',pg_get_userbyid(p.proowner),
  'referencia_geradora',p.prosrc ~* '\mgenerate_birthday_coupons\M',
  'hash_definicao',md5(pg_get_functiondef(p.oid))
) ORDER BY n.nspname,p.proname),'[]'::jsonb) AS resultado
FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE p.prokind IN ('f','p') AND n.nspname NOT IN ('pg_catalog','information_schema')
  AND p.prosrc ~* '\mgenerate_birthday_coupons(_scheduled)?\M';

SELECT '05_gatilhos_e_extensoes' AS secao, jsonb_build_object(
  'gatilhos',coalesce((SELECT jsonb_agg(jsonb_build_object(
    'tabela',tgrelid::regclass::text,'nome',tgname,'ativo',tgenabled,
    'funcao',tgfoid::regprocedure::text) ORDER BY tgrelid::regclass::text,tgname)
    FROM pg_trigger WHERE NOT tgisinternal AND tgfoid IN (
      to_regprocedure('public.generate_birthday_coupons()'),
      to_regprocedure('public.generate_birthday_coupons_scheduled()'))),'[]'::jsonb),
  'extensoes_agendamento',coalesce((SELECT jsonb_agg(jsonb_build_object(
    'nome',extname,'versao',extversion,'esquema',extnamespace::regnamespace::text))
    FROM pg_extension WHERE extname IN ('pg_cron','pg_net')),'[]'::jsonb),
  'catalogo_cron_existe',to_regclass('cron.job') IS NOT NULL
) AS resultado;

SELECT '06_resumo_sem_dados_pessoais' AS secao, jsonb_build_object(
  'cupons_aniversario_total',(SELECT count(*) FROM public.coupons WHERE type='birthday'),
  'cupons_aniversario_ativos',(SELECT count(*) FROM public.coupons WHERE type='birthday' AND active IS TRUE),
  'cupons_aniversario_pendentes',(SELECT count(*) FROM public.coupons WHERE type='birthday' AND is_pending_admin_approval IS TRUE),
  'funcoes_encontradas',(SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public' AND p.proname IN ('generate_birthday_coupons','generate_birthday_coupons_scheduled'))
) AS resultado;

COMMIT;
