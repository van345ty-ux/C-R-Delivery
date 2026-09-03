-- APENAS no PostgreSQL descartável do compose de testes. Não executar em produção.
CREATE ROLE authenticator LOGIN NOINHERIT;
GRANT anon, authenticated TO authenticator;

-- O PostgREST fornece as claims em JSON; os testes SQL antigos usam a claim separada.
CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
  SELECT coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub'
  )::uuid;
$$;

-- O executor exige este marcador antes de qualquer escrita pela API local.
CREATE FUNCTION public.cr_sushi_test_environment() RETURNS text
LANGUAGE sql STABLE SET search_path = '' AS $$
  SELECT 'cr-sushi-isolated-order-api'::text;
$$;
GRANT EXECUTE ON FUNCTION public.cr_sushi_test_environment() TO anon, authenticated;
NOTIFY pgrst, 'reload schema';
