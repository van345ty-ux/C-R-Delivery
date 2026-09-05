DO $check$
BEGIN
  IF to_regprocedure('public.prepare_order_quote(uuid,jsonb,text,text,text,uuid)') IS NULL
     OR to_regprocedure('public.prepare_order_quote_with_access(uuid,jsonb,text,text,text,uuid)') IS NULL THEN
    RAISE EXCEPTION 'As funcoes de cotacao esperadas nao foram encontradas.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_proc
    WHERE oid = to_regprocedure('public.prepare_order_quote_with_access(uuid,jsonb,text,text,text,uuid)')
      AND prosecdef
      AND position('public.prepare_order_quote(' IN prosrc) > 0
  ) THEN
    RAISE EXCEPTION 'A funcao protegida nao preserva a chamada interna esperada.';
  END IF;
END
$check$;

REVOKE EXECUTE ON FUNCTION public.prepare_order_quote(uuid,jsonb,text,text,text,uuid)
  FROM PUBLIC, anon, authenticated, service_role;
