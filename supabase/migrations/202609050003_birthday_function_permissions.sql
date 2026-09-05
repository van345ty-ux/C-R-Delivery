-- Restringe funcoes antigas de geracao de cupons de aniversario.
-- A criacao e aprovacao manual de cupons pelo painel administrativo permanece intacta.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc
    WHERE oid=to_regprocedure('public.generate_birthday_coupons()')
      AND prorettype='trigger'::regtype
      AND prosecdef
      AND proconfig=ARRAY['search_path=""']::text[]
      AND pg_get_userbyid(proowner)='postgres'
      AND md5(replace(prosrc,E'\r\n',E'\n'))='8e1541f3a5ed81b086949c0e65ee31d7'
  ) THEN
    RAISE EXCEPTION 'Funcao generate_birthday_coupons diferente da versao revisada.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_proc
    WHERE oid=to_regprocedure('public.generate_birthday_coupons_scheduled()')
      AND prorettype='void'::regtype
      AND NOT prosecdef
      AND proconfig IS NULL
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
    RAISE EXCEPTION 'Foi encontrado um gatilho novo. Repetir o diagnostico antes de continuar.';
  END IF;
END;
$$;

-- A implementacao das funcoes nao e alterada.
ALTER FUNCTION public.generate_birthday_coupons_scheduled() SET search_path = '';

REVOKE EXECUTE ON FUNCTION public.generate_birthday_coupons() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.generate_birthday_coupons_scheduled() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.generate_birthday_coupons() TO service_role;
GRANT EXECUTE ON FUNCTION public.generate_birthday_coupons_scheduled() TO service_role;

NOTIFY pgrst, 'reload schema';
COMMIT;
