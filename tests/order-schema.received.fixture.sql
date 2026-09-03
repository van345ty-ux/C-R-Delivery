-- TESTE LOCAL DESCARTÁVEL. Não executar no Supabase real.
-- Reproduz os dois exports de metadados; auth e os dados são fictícios.
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
CREATE ROLE service_role;
CREATE SEQUENCE public.orders_order_number_seq AS bigint INCREMENT BY 1 MINVALUE 1 NO MAXVALUE CACHE 1 NO CYCLE;
GRANT SELECT, UPDATE, USAGE ON SEQUENCE public.orders_order_number_seq TO "postgres";
GRANT SELECT, UPDATE, USAGE ON SEQUENCE public.orders_order_number_seq TO "anon";
GRANT SELECT, UPDATE, USAGE ON SEQUENCE public.orders_order_number_seq TO "authenticated";
GRANT SELECT, UPDATE, USAGE ON SEQUENCE public.orders_order_number_seq TO "service_role";
CREATE TABLE public."profiles" (
  "id" uuid NOT NULL,
  "full_name" text,
  "phone" text,
  "birth_date" date,
  "purchase_count" integer DEFAULT 0,
  "updated_at" timestamptz DEFAULT now(),
  "role" text DEFAULT 'customer'::text NOT NULL,
  "birth_date_last_changed_at" timestamptz DEFAULT now()
);
CREATE TABLE public."coupons" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "name" text NOT NULL,
  "code" text NOT NULL,
  "discount" integer NOT NULL,
  "type" text DEFAULT 'promotion'::text NOT NULL,
  "valid_from" date NOT NULL,
  "valid_to" date NOT NULL,
  "active" boolean DEFAULT true,
  "usage_limit" integer,
  "usage_count" integer DEFAULT 0,
  "created_at" timestamptz DEFAULT now(),
  "user_id" uuid,
  "is_pending_admin_approval" boolean DEFAULT false
);
CREATE TABLE public."orders" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid,
  "items" jsonb NOT NULL,
  "total" numeric NOT NULL,
  "delivery_fee" numeric NOT NULL,
  "delivery_type" text NOT NULL,
  "payment_method" text NOT NULL,
  "address" text,
  "status" text DEFAULT 'Pedido recebido'::text NOT NULL,
  "customer_name" text NOT NULL,
  "customer_phone" text,
  "coupon_used" text,
  "created_at" timestamptz DEFAULT now(),
  "order_number" integer DEFAULT nextval('orders_order_number_seq'::regclass) NOT NULL,
  "change_for" numeric,
  "sushi_egg_delivery_day" text
);
ALTER TABLE public."coupons" ADD CONSTRAINT "coupons_code_key" UNIQUE (code);
ALTER TABLE public."coupons" ADD CONSTRAINT "coupons_discount_check" CHECK (((discount > 0) AND (discount <= 100)));
ALTER TABLE public."coupons" ADD CONSTRAINT "coupons_pkey" PRIMARY KEY (id);
ALTER TABLE public."orders" ADD CONSTRAINT "orders_order_number_key" UNIQUE (order_number);
ALTER TABLE public."orders" ADD CONSTRAINT "orders_pkey" PRIMARY KEY (id);
ALTER TABLE public."profiles" ADD CONSTRAINT "profiles_pkey" PRIMARY KEY (id);
ALTER TABLE public."coupons" ADD CONSTRAINT "coupons_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public."coupons" ADD CONSTRAINT "fk_user_id" FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
ALTER TABLE public."orders" ADD CONSTRAINT "orders_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public."profiles" ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
CREATE OR REPLACE FUNCTION public.get_my_role()
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  RETURN (
    SELECT role
    FROM public.profiles
    WHERE id = auth.uid()
  );
END;
$function$
;
GRANT EXECUTE ON FUNCTION public.get_my_role() TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_role() TO "postgres";
GRANT EXECUTE ON FUNCTION public.get_my_role() TO "anon";
GRANT EXECUTE ON FUNCTION public.get_my_role() TO "authenticated";
GRANT EXECUTE ON FUNCTION public.get_my_role() TO "service_role";
GRANT DELETE ON public."coupons" TO "anon";
GRANT INSERT ON public."coupons" TO "anon";
GRANT REFERENCES ON public."coupons" TO "anon";
GRANT SELECT ON public."coupons" TO "anon";
GRANT TRIGGER ON public."coupons" TO "anon";
GRANT TRUNCATE ON public."coupons" TO "anon";
GRANT UPDATE ON public."coupons" TO "anon";
GRANT DELETE ON public."coupons" TO "authenticated";
GRANT INSERT ON public."coupons" TO "authenticated";
GRANT REFERENCES ON public."coupons" TO "authenticated";
GRANT SELECT ON public."coupons" TO "authenticated";
GRANT TRIGGER ON public."coupons" TO "authenticated";
GRANT TRUNCATE ON public."coupons" TO "authenticated";
GRANT UPDATE ON public."coupons" TO "authenticated";
GRANT DELETE ON public."coupons" TO "postgres";
GRANT INSERT ON public."coupons" TO "postgres";
GRANT REFERENCES ON public."coupons" TO "postgres";
GRANT SELECT ON public."coupons" TO "postgres";
GRANT TRIGGER ON public."coupons" TO "postgres";
GRANT TRUNCATE ON public."coupons" TO "postgres";
GRANT UPDATE ON public."coupons" TO "postgres";
GRANT DELETE ON public."coupons" TO "service_role";
GRANT INSERT ON public."coupons" TO "service_role";
GRANT REFERENCES ON public."coupons" TO "service_role";
GRANT SELECT ON public."coupons" TO "service_role";
GRANT TRIGGER ON public."coupons" TO "service_role";
GRANT TRUNCATE ON public."coupons" TO "service_role";
GRANT UPDATE ON public."coupons" TO "service_role";
GRANT DELETE ON public."orders" TO "anon";
GRANT INSERT ON public."orders" TO "anon";
GRANT REFERENCES ON public."orders" TO "anon";
GRANT SELECT ON public."orders" TO "anon";
GRANT TRIGGER ON public."orders" TO "anon";
GRANT TRUNCATE ON public."orders" TO "anon";
GRANT UPDATE ON public."orders" TO "anon";
GRANT DELETE ON public."orders" TO "authenticated";
GRANT INSERT ON public."orders" TO "authenticated";
GRANT REFERENCES ON public."orders" TO "authenticated";
GRANT SELECT ON public."orders" TO "authenticated";
GRANT TRIGGER ON public."orders" TO "authenticated";
GRANT TRUNCATE ON public."orders" TO "authenticated";
GRANT UPDATE ON public."orders" TO "authenticated";
GRANT DELETE ON public."orders" TO "postgres";
GRANT INSERT ON public."orders" TO "postgres";
GRANT REFERENCES ON public."orders" TO "postgres";
GRANT SELECT ON public."orders" TO "postgres";
GRANT TRIGGER ON public."orders" TO "postgres";
GRANT TRUNCATE ON public."orders" TO "postgres";
GRANT UPDATE ON public."orders" TO "postgres";
GRANT DELETE ON public."orders" TO "service_role";
GRANT INSERT ON public."orders" TO "service_role";
GRANT REFERENCES ON public."orders" TO "service_role";
GRANT SELECT ON public."orders" TO "service_role";
GRANT TRIGGER ON public."orders" TO "service_role";
GRANT TRUNCATE ON public."orders" TO "service_role";
GRANT UPDATE ON public."orders" TO "service_role";
GRANT DELETE ON public.profiles TO "anon";
GRANT INSERT ON public.profiles TO "anon";
GRANT REFERENCES ON public.profiles TO "anon";
GRANT SELECT ON public.profiles TO "anon";
GRANT TRIGGER ON public.profiles TO "anon";
GRANT TRUNCATE ON public.profiles TO "anon";
GRANT UPDATE ON public.profiles TO "anon";
GRANT DELETE ON public.profiles TO "authenticated";
GRANT INSERT ON public.profiles TO "authenticated";
GRANT REFERENCES ON public.profiles TO "authenticated";
GRANT SELECT ON public.profiles TO "authenticated";
GRANT TRIGGER ON public.profiles TO "authenticated";
GRANT TRUNCATE ON public.profiles TO "authenticated";
GRANT UPDATE ON public.profiles TO "authenticated";
GRANT DELETE ON public.profiles TO "postgres";
GRANT INSERT ON public.profiles TO "postgres";
GRANT REFERENCES ON public.profiles TO "postgres";
GRANT SELECT ON public.profiles TO "postgres";
GRANT TRIGGER ON public.profiles TO "postgres";
GRANT TRUNCATE ON public.profiles TO "postgres";
GRANT UPDATE ON public.profiles TO "postgres";
GRANT DELETE ON public.profiles TO "service_role";
GRANT INSERT ON public.profiles TO "service_role";
GRANT REFERENCES ON public.profiles TO "service_role";
GRANT SELECT ON public.profiles TO "service_role";
GRANT TRIGGER ON public.profiles TO "service_role";
GRANT TRUNCATE ON public.profiles TO "service_role";
GRANT UPDATE ON public.profiles TO "service_role";
GRANT USAGE ON SCHEMA "auth" TO authenticated;
GRANT USAGE ON SCHEMA "public" TO authenticated;
ALTER TABLE public."coupons" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."orders" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."profiles" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins have full access to coupons" ON public."coupons" FOR ALL TO "authenticated" USING ((get_my_role() = 'admin'::text)) WITH CHECK ((get_my_role() = 'admin'::text));
CREATE POLICY "Authenticated users can delete general or their own coupons" ON public."coupons" FOR DELETE TO "authenticated" USING (((user_id IS NULL) OR (auth.uid() = user_id)));
CREATE POLICY "Authenticated users can insert general or their own coupons" ON public."coupons" FOR INSERT TO "authenticated" WITH CHECK (((user_id IS NULL) OR (auth.uid() = user_id)));
CREATE POLICY "Authenticated users can read general and their own coupons" ON public."coupons" FOR SELECT TO "authenticated" USING (((user_id IS NULL) OR (auth.uid() = user_id)));
CREATE POLICY "Authenticated users can update general or their own coupons" ON public."coupons" FOR UPDATE TO "authenticated" USING (((user_id IS NULL) OR (auth.uid() = user_id)));
CREATE POLICY "Acesso Inserir Pedidos" ON public."orders" FOR INSERT TO "authenticated" WITH CHECK (((user_id = auth.uid()) OR (get_my_role() = 'admin'::text)));
CREATE POLICY "Acesso Leitura Pedidos" ON public."orders" FOR SELECT TO "authenticated" USING (((user_id = auth.uid()) OR (get_my_role() = 'admin'::text)));
CREATE POLICY "Admins alteram/deletam pedidos" ON public."orders" FOR UPDATE TO "authenticated" USING ((get_my_role() = 'admin'::text));
CREATE POLICY "Admins can delete any order" ON public."orders" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::text)))));
CREATE POLICY "Admins can read all orders" ON public."orders" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::text)))));
CREATE POLICY "Admins can update any order" ON public."orders" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::text)))));
CREATE POLICY "Users can insert their own orders" ON public."orders" FOR INSERT TO "authenticated" WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Users can view their own orders" ON public."orders" FOR SELECT TO "authenticated" USING ((auth.uid() = user_id));
CREATE POLICY "Admins have full access" ON public."profiles" FOR ALL TO "authenticated" USING ((get_my_role() = 'admin'::text)) WITH CHECK ((get_my_role() = 'admin'::text));
CREATE POLICY "Users can create their own profile" ON public."profiles" FOR INSERT TO "authenticated" WITH CHECK ((id = auth.uid()));
CREATE POLICY "Users can read their own profile" ON public."profiles" FOR SELECT TO "authenticated" USING ((id = auth.uid()));
CREATE POLICY "Users can update their own profile" ON public."profiles" FOR UPDATE TO "authenticated" USING ((id = auth.uid()));
CREATE OR REPLACE FUNCTION public.increment_coupon_usage(p_coupon_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  UPDATE coupons 
  SET usage_count = usage_count + 1 
  WHERE id = p_coupon_id;
END;
$function$
;

GRANT EXECUTE ON FUNCTION public.increment_coupon_usage(uuid) TO PUBLIC, anon, authenticated, service_role;
INSERT INTO public.profiles (id, role) VALUES
 ('00000000-0000-4000-8000-000000000001', 'customer'),
 ('00000000-0000-4000-8000-000000000002', 'customer');
INSERT INTO public.coupons (id, name, code, discount, valid_from, valid_to) VALUES
 ('00000000-0000-4000-8000-000000000010', 'Teste local', 'TESTE', 10, '2026-01-01', '2026-12-31'),
 ('00000000-0000-4000-8000-000000000011', 'Falha local', 'FALHA', 10, '2026-01-01', '2026-12-31');
CREATE FUNCTION public.fail_test_coupon_update() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.id = '00000000-0000-4000-8000-000000000011' THEN RAISE EXCEPTION 'Falha simulada do cupom'; END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER fail_test_coupon_update BEFORE UPDATE ON public.coupons
FOR EACH ROW EXECUTE FUNCTION public.fail_test_coupon_update();
