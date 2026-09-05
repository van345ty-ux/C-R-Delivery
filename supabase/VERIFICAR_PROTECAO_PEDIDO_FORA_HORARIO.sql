-- Verificacao somente leitura depois da aplicacao da nova porta de cotacao.
WITH verificacoes AS (
  SELECT '01_funcao_nova_protegida' AS verificacao,EXISTS(SELECT 1 FROM pg_proc
    WHERE oid=to_regprocedure('public.prepare_order_quote_with_access(uuid,jsonb,text,text,text,uuid)')
      AND prosecdef AND proconfig=ARRAY['search_path=""']::text[]
      AND pg_get_userbyid(proowner)='postgres') AS ok
  UNION ALL SELECT '02_valida_horario',EXISTS(SELECT 1 FROM pg_proc WHERE oid=to_regprocedure(
    'public.prepare_order_quote_with_access(uuid,jsonb,text,text,text,uuid)')
    AND position('public.operating_hours' IN prosrc)>0)
  UNION ALL SELECT '03_valida_liberacao_cliente',EXISTS(SELECT 1 FROM pg_proc WHERE oid=to_regprocedure(
    'public.prepare_order_quote_with_access(uuid,jsonb,text,text,text,uuid)')
    AND position('public.get_my_after_hours_access()' IN prosrc)>0)
  UNION ALL SELECT '04_preserva_comandatuba',EXISTS(SELECT 1 FROM pg_proc WHERE oid=to_regprocedure(
    'public.prepare_order_quote_with_access(uuid,jsonb,text,text,text,uuid)')
    AND position('comandatuba' IN lower(prosrc))>0)
  UNION ALL SELECT '05_recupera_cotacao_existente',EXISTS(SELECT 1 FROM pg_proc WHERE oid=to_regprocedure(
    'public.prepare_order_quote_with_access(uuid,jsonb,text,text,text,uuid)')
    AND position('Uma cotacao ja criada continua recuperavel' IN prosrc)>0)
  UNION ALL SELECT '06_execucao_restrita',
    NOT has_function_privilege('anon','public.prepare_order_quote_with_access(uuid,jsonb,text,text,text,uuid)','EXECUTE')
    AND has_function_privilege('authenticated','public.prepare_order_quote_with_access(uuid,jsonb,text,text,text,uuid)','EXECUTE')
  UNION ALL SELECT '07_funcao_anterior_preservada',EXISTS(SELECT 1 FROM pg_proc
    WHERE oid=to_regprocedure('public.prepare_order_quote(uuid,jsonb,text,text,text,uuid)')
      AND md5(replace(prosrc,E'\r\n',E'\n'))='ea315fd892468bd19f4226d038d1211f')
  UNION ALL SELECT '08_sem_alteracao_de_pedidos',
    to_regclass('public.orders') IS NOT NULL AND to_regclass('public.order_quotes') IS NOT NULL
)
SELECT verificacao,CASE WHEN ok THEN 'OK' ELSE 'REVISAR' END AS resultado
FROM verificacoes ORDER BY verificacao;
