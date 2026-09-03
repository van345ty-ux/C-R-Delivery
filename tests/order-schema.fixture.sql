-- Banco descartável de testes. Não executar no Supabase real.
CREATE ROLE anon;
CREATE ROLE authenticated;
CREATE SCHEMA auth;
CREATE TABLE auth.users (id uuid PRIMARY KEY);
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
  SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;
GRANT USAGE ON SCHEMA auth TO authenticated, anon;
GRANT EXECUTE ON FUNCTION auth.uid() TO authenticated, anon;
INSERT INTO auth.users VALUES ('00000000-0000-4000-8000-000000000001'), ('00000000-0000-4000-8000-000000000002');
CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number bigint GENERATED ALWAYS AS IDENTITY,
  user_id uuid NOT NULL REFERENCES auth.users(id),
  items jsonb NOT NULL, total numeric NOT NULL, delivery_fee numeric NOT NULL,
  delivery_type text NOT NULL, payment_method text NOT NULL,
  address text, status text NOT NULL, customer_name text NOT NULL,
  customer_phone text NOT NULL, coupon_used text, change_for numeric,
  sushi_egg_delivery_day text, created_at timestamptz DEFAULT now()
);
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY select_own ON public.orders FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY insert_own ON public.orders FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
GRANT SELECT, INSERT ON public.orders TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;
CREATE TABLE public.coupons (id uuid PRIMARY KEY, code text, usage_count integer NOT NULL DEFAULT 0);
INSERT INTO public.coupons (id, code) VALUES
  ('00000000-0000-4000-8000-000000000010', 'TESTE'),
  ('00000000-0000-4000-8000-000000000011', 'FALHA');
GRANT SELECT ON public.coupons TO authenticated;
-- Definição real fornecida pelo usuário, incluindo SECURITY DEFINER e tabela
-- sem schema. O cliente de teste não pode atualizar coupons diretamente.
CREATE FUNCTION public.increment_coupon_usage(p_coupon_id uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE coupons SET usage_count = usage_count + 1 WHERE id = p_coupon_id;
END;
$$;

-- Injeção de falha exclusiva do teste, independente do corpo da função real.
CREATE FUNCTION public.fail_test_coupon_update() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.id = '00000000-0000-4000-8000-000000000011' THEN RAISE EXCEPTION 'Falha simulada do cupom'; END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER fail_test_coupon_update BEFORE UPDATE ON public.coupons
FOR EACH ROW EXECUTE FUNCTION public.fail_test_coupon_update();
