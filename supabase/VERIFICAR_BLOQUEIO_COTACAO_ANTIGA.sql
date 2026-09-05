SELECT verificacao, resultado
FROM (VALUES
  ('01_funcao_antiga_preservada', CASE WHEN
    to_regprocedure('public.prepare_order_quote(uuid,jsonb,text,text,text,uuid)') IS NOT NULL
    THEN 'OK' ELSE 'REVISAR' END),
  ('02_funcao_nova_preservada', CASE WHEN
    to_regprocedure('public.prepare_order_quote_with_access(uuid,jsonb,text,text,text,uuid)') IS NOT NULL
    THEN 'OK' ELSE 'REVISAR' END),
  ('03_antiga_bloqueada_anon', CASE WHEN
    NOT has_function_privilege('anon','public.prepare_order_quote(uuid,jsonb,text,text,text,uuid)','EXECUTE')
    THEN 'OK' ELSE 'REVISAR' END),
  ('04_antiga_bloqueada_cliente', CASE WHEN
    NOT has_function_privilege('authenticated','public.prepare_order_quote(uuid,jsonb,text,text,text,uuid)','EXECUTE')
    THEN 'OK' ELSE 'REVISAR' END),
  ('05_antiga_bloqueada_api_interna', CASE WHEN
    NOT has_function_privilege('service_role','public.prepare_order_quote(uuid,jsonb,text,text,text,uuid)','EXECUTE')
    THEN 'OK' ELSE 'REVISAR' END),
  ('06_nova_disponivel_cliente', CASE WHEN
    has_function_privilege('authenticated','public.prepare_order_quote_with_access(uuid,jsonb,text,text,text,uuid)','EXECUTE')
    THEN 'OK' ELSE 'REVISAR' END),
  ('07_nova_bloqueada_anon', CASE WHEN
    NOT has_function_privilege('anon','public.prepare_order_quote_with_access(uuid,jsonb,text,text,text,uuid)','EXECUTE')
    THEN 'OK' ELSE 'REVISAR' END),
  ('08_chamada_interna_preservada', CASE WHEN EXISTS (
    SELECT 1 FROM pg_proc
    WHERE oid=to_regprocedure('public.prepare_order_quote_with_access(uuid,jsonb,text,text,text,uuid)')
      AND prosecdef
      AND position('public.prepare_order_quote(' IN prosrc)>0
  ) THEN 'OK' ELSE 'REVISAR' END)
) AS checks(verificacao, resultado)
ORDER BY verificacao;
