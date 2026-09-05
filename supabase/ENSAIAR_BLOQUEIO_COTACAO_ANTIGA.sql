BEGIN;

DO $check$
BEGIN
  IF to_regprocedure('public.prepare_order_quote(uuid,jsonb,text,text,text,uuid)') IS NULL THEN
    RAISE EXCEPTION 'A funcao antiga prepare_order_quote nao foi encontrada.';
  END IF;

  IF to_regprocedure('public.prepare_order_quote_with_access(uuid,jsonb,text,text,text,uuid)') IS NULL THEN
    RAISE EXCEPTION 'A funcao protegida prepare_order_quote_with_access nao foi encontrada.';
  END IF;

  IF NOT has_function_privilege(
    'authenticated',
    'public.prepare_order_quote_with_access(uuid,jsonb,text,text,text,uuid)',
    'EXECUTE'
  ) THEN
    RAISE EXCEPTION 'A funcao protegida nao esta disponivel para clientes autenticados.';
  END IF;
END
$check$;

REVOKE EXECUTE ON FUNCTION public.prepare_order_quote(uuid,jsonb,text,text,text,uuid)
  FROM PUBLIC, anon, authenticated, service_role;

DO $verify$
BEGIN
  IF has_function_privilege(
    'anon',
    'public.prepare_order_quote(uuid,jsonb,text,text,text,uuid)',
    'EXECUTE'
  ) OR has_function_privilege(
    'authenticated',
    'public.prepare_order_quote(uuid,jsonb,text,text,text,uuid)',
    'EXECUTE'
  ) OR has_function_privilege(
    'service_role',
    'public.prepare_order_quote(uuid,jsonb,text,text,text,uuid)',
    'EXECUTE'
  ) THEN
    RAISE EXCEPTION 'A funcao antiga ainda possui acesso externo.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_proc
    WHERE oid = to_regprocedure('public.prepare_order_quote_with_access(uuid,jsonb,text,text,text,uuid)')
      AND position('public.prepare_order_quote(' IN prosrc) > 0
  ) THEN
    RAISE EXCEPTION 'A chamada interna da funcao antiga nao foi preservada.';
  END IF;
END
$verify$;

ROLLBACK;

SELECT 'Ensaio do bloqueio da cotacao antiga concluido. Todas as alteracoes desta transacao foram desfeitas.' AS resultado;
