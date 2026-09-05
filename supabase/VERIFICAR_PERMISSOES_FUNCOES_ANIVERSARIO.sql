-- Verificacao somente leitura para depois da aplicacao definitiva.
WITH verificacoes AS (
  SELECT '01_funcoes_preservadas' AS verificacao,
    (SELECT count(*)=2 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
      WHERE n.nspname='public' AND p.proname IN
        ('generate_birthday_coupons','generate_birthday_coupons_scheduled')) AS ok

  UNION ALL SELECT '02_logica_preservada',
    EXISTS (SELECT 1 FROM pg_proc WHERE oid=to_regprocedure('public.generate_birthday_coupons()')
      AND md5(replace(prosrc,E'\r\n',E'\n'))='8e1541f3a5ed81b086949c0e65ee31d7')
    AND EXISTS (SELECT 1 FROM pg_proc WHERE oid=to_regprocedure('public.generate_birthday_coupons_scheduled()')
      AND md5(replace(prosrc,E'\r\n',E'\n'))='e1bb6e8713406df06d0eef5f1c4e5683')

  UNION ALL SELECT '03_search_path_fixo',
    EXISTS (SELECT 1 FROM pg_proc WHERE oid=to_regprocedure('public.generate_birthday_coupons()')
      AND proconfig=ARRAY['search_path=""']::text[])
    AND EXISTS (SELECT 1 FROM pg_proc WHERE oid=to_regprocedure('public.generate_birthday_coupons_scheduled()')
      AND proconfig=ARRAY['search_path=""']::text[])

  UNION ALL SELECT '04_sem_execucao_anon',
    NOT has_function_privilege('anon','public.generate_birthday_coupons()','EXECUTE')
    AND NOT has_function_privilege('anon','public.generate_birthday_coupons_scheduled()','EXECUTE')

  UNION ALL SELECT '05_sem_execucao_authenticated',
    NOT has_function_privilege('authenticated','public.generate_birthday_coupons()','EXECUTE')
    AND NOT has_function_privilege('authenticated','public.generate_birthday_coupons_scheduled()','EXECUTE')

  UNION ALL SELECT '06_execucao_interna_preservada',
    has_function_privilege('service_role','public.generate_birthday_coupons()','EXECUTE')
    AND has_function_privilege('service_role','public.generate_birthday_coupons_scheduled()','EXECUTE')

  UNION ALL SELECT '07_sem_gatilhos_inesperados',
    NOT EXISTS (SELECT 1 FROM pg_trigger WHERE NOT tgisinternal AND tgfoid IN (
      to_regprocedure('public.generate_birthday_coupons()'),
      to_regprocedure('public.generate_birthday_coupons_scheduled()')))

  UNION ALL SELECT '08_painel_admin_preservado',
    has_table_privilege('authenticated','public.coupons','SELECT')
    AND has_table_privilege('authenticated','public.coupons','INSERT')
    AND has_table_privilege('authenticated','public.coupons','UPDATE')
    AND has_table_privilege('authenticated','public.coupons','DELETE')
    AND EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='coupons'
      AND policyname='Admins have full access to coupons' AND cmd='ALL')
)
SELECT verificacao,CASE WHEN ok THEN 'OK' ELSE 'REVISAR' END AS resultado
FROM verificacoes ORDER BY verificacao;
