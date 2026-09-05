-- Verificacao somente leitura para depois da aplicacao definitiva.
WITH verificacoes AS (
  SELECT '01_tabelas_criadas' AS verificacao,
    to_regclass('public.after_hours_access_config') IS NOT NULL
    AND to_regclass('public.after_hours_access_members') IS NOT NULL AS ok
  UNION ALL SELECT '02_rls_ativo',
    EXISTS(SELECT 1 FROM pg_class WHERE oid='public.after_hours_access_config'::regclass AND relrowsecurity)
    AND EXISTS(SELECT 1 FROM pg_class WHERE oid='public.after_hours_access_members'::regclass AND relrowsecurity)
  UNION ALL SELECT '03_estado_inicial_fechado',
    (SELECT mode='none' FROM public.after_hours_access_config WHERE singleton)
    AND NOT EXISTS(SELECT 1 FROM public.after_hours_access_members)
  UNION ALL SELECT '04_politicas_admin',
    (SELECT count(*)=2 FROM pg_policies WHERE schemaname='public'
      AND tablename IN ('after_hours_access_config','after_hours_access_members')
      AND cmd='ALL' AND roles=ARRAY['authenticated']::name[]
      AND qual='(get_my_role() = ''admin''::text)'
      AND with_check='(get_my_role() = ''admin''::text)')
  UNION ALL SELECT '05_sem_leitura_anon',
    NOT has_table_privilege('anon','public.after_hours_access_config','SELECT')
    AND NOT has_table_privilege('anon','public.after_hours_access_members','SELECT')
  UNION ALL SELECT '06_funcoes_protegidas',
    EXISTS(SELECT 1 FROM pg_proc WHERE oid=to_regprocedure('public.set_after_hours_access(text,uuid[])')
      AND prosecdef AND proconfig=ARRAY['search_path=""']::text[])
    AND EXISTS(SELECT 1 FROM pg_proc WHERE oid=to_regprocedure('public.get_my_after_hours_access()')
      AND prosecdef AND proconfig=ARRAY['search_path=""']::text[])
  UNION ALL SELECT '07_execucao_restrita',
    NOT has_function_privilege('anon','public.set_after_hours_access(text,uuid[])','EXECUTE')
    AND NOT has_function_privilege('anon','public.get_my_after_hours_access()','EXECUTE')
    AND has_function_privilege('authenticated','public.set_after_hours_access(text,uuid[])','EXECUTE')
    AND has_function_privilege('authenticated','public.get_my_after_hours_access()','EXECUTE')
  UNION ALL SELECT '08_perfis_preservados',
    EXISTS(SELECT 1 FROM pg_class WHERE oid='public.profiles'::regclass AND relrowsecurity)
    AND EXISTS(SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='profiles'
      AND policyname='Admins have full access')
  UNION ALL SELECT '09_cotacao_preservada',
    EXISTS(SELECT 1 FROM pg_proc WHERE oid=to_regprocedure('public.prepare_order_quote(uuid,jsonb,text,text,text,uuid)')
      AND md5(replace(prosrc,E'\r\n',E'\n'))='ea315fd892468bd19f4226d038d1211f')
  UNION ALL SELECT '10_sem_autorizacoes_inesperadas',
    NOT EXISTS(SELECT 1 FROM public.after_hours_access_members)
)
SELECT verificacao,CASE WHEN ok THEN 'OK' ELSE 'REVISAR' END AS resultado
FROM verificacoes ORDER BY verificacao;
