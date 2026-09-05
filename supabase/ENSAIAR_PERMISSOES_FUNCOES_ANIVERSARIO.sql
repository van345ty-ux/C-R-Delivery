-- ENSAIO: aplica a mudanca dentro da transacao e desfaz tudo ao final.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc
    WHERE oid=to_regprocedure('public.generate_birthday_coupons()')
      AND prorettype='trigger'::regtype AND prosecdef
      AND proconfig=ARRAY['search_path=""']::text[]
      AND pg_get_userbyid(proowner)='postgres'
      AND md5(replace(prosrc,E'\r\n',E'\n'))='8e1541f3a5ed81b086949c0e65ee31d7'
  ) THEN
    RAISE EXCEPTION 'Funcao generate_birthday_coupons diferente da versao revisada.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_proc
    WHERE oid=to_regprocedure('public.generate_birthday_coupons_scheduled()')
      AND prorettype='void'::regtype AND NOT prosecdef AND proconfig IS NULL
      AND pg_get_userbyid(proowner)='postgres'
      AND md5(replace(prosrc,E'\r\n',E'\n'))='e1bb6e8713406df06d0eef5f1c4e5683'
  ) THEN
    RAISE EXCEPTION 'Funcao generate_birthday_coupons_scheduled diferente da versao revisada.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE NOT tgisinternal AND tgfoid IN (
      to_regprocedure('public.generate_birthday_coupons()'),
      to_regprocedure('public.generate_birthday_coupons_scheduled()')
    )
  ) THEN
    RAISE EXCEPTION 'Foi encontrado um gatilho novo. Repetir o diagnostico.';
  END IF;
END;
$$;

ALTER FUNCTION public.generate_birthday_coupons_scheduled() SET search_path = '';
REVOKE EXECUTE ON FUNCTION public.generate_birthday_coupons() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.generate_birthday_coupons_scheduled() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.generate_birthday_coupons() TO service_role;
GRANT EXECUTE ON FUNCTION public.generate_birthday_coupons_scheduled() TO service_role;

DO $$
BEGIN
  IF has_function_privilege('anon','public.generate_birthday_coupons()','EXECUTE')
    OR has_function_privilege('authenticated','public.generate_birthday_coupons()','EXECUTE')
    OR has_function_privilege('anon','public.generate_birthday_coupons_scheduled()','EXECUTE')
    OR has_function_privilege('authenticated','public.generate_birthday_coupons_scheduled()','EXECUTE') THEN
    RAISE EXCEPTION 'As permissoes publicas nao foram removidas.';
  END IF;

  IF NOT has_function_privilege('service_role','public.generate_birthday_coupons()','EXECUTE')
    OR NOT has_function_privilege('service_role','public.generate_birthday_coupons_scheduled()','EXECUTE') THEN
    RAISE EXCEPTION 'A execucao interna nao foi preservada.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_proc
    WHERE oid=to_regprocedure('public.generate_birthday_coupons_scheduled()')
      AND proconfig=ARRAY['search_path=""']::text[]
      AND md5(replace(prosrc,E'\r\n',E'\n'))='e1bb6e8713406df06d0eef5f1c4e5683'
  ) THEN
    RAISE EXCEPTION 'A protecao de search_path falhou ou a logica foi alterada.';
  END IF;
END;
$$;

ROLLBACK;
SELECT 'Ensaio das funcoes de aniversario concluido. Todas as alteracoes desta transacao foram desfeitas.' AS resultado;
