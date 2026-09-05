-- Verificacao somente leitura depois da correcao.
WITH verificacoes AS (
  SELECT '01_funcao_protegida' AS verificacao,EXISTS(SELECT 1 FROM pg_proc
    WHERE oid=to_regprocedure('public.set_after_hours_access(text,uuid[])')
      AND prosecdef AND proconfig=ARRAY['search_path=""']::text[]
      AND pg_get_userbyid(proowner)='postgres') AS ok
  UNION ALL SELECT '02_delete_com_where',EXISTS(SELECT 1 FROM pg_proc
    WHERE oid=to_regprocedure('public.set_after_hours_access(text,uuid[])')
      AND position('DELETE FROM public.after_hours_access_members WHERE user_id IS NOT NULL;' IN prosrc)>0)
  UNION ALL SELECT '03_delete_antigo_removido',NOT EXISTS(SELECT 1 FROM pg_proc
    WHERE oid=to_regprocedure('public.set_after_hours_access(text,uuid[])')
      AND position('DELETE FROM public.after_hours_access_members;' IN prosrc)>0)
  UNION ALL SELECT '04_estado_ainda_fechado',
    (SELECT mode='none' FROM public.after_hours_access_config WHERE singleton)
    AND NOT EXISTS(SELECT 1 FROM public.after_hours_access_members)
  UNION ALL SELECT '05_execucao_admin_preservada',
    has_function_privilege('authenticated','public.set_after_hours_access(text,uuid[])','EXECUTE')
    AND NOT has_function_privilege('anon','public.set_after_hours_access(text,uuid[])','EXECUTE')
)
SELECT verificacao,CASE WHEN ok THEN 'OK' ELSE 'REVISAR' END AS resultado
FROM verificacoes ORDER BY verificacao;
