-- Fase 1D-A: fundacao isolada de cotacao e reserva de cupom.
-- Esta migracao nao altera submit_order_once nem o frontend.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';

DO $preflight$
BEGIN
  IF to_regclass('public.order_quotes') IS NOT NULL
     OR to_regprocedure('public.prepare_order_quote(uuid,jsonb,text,text,text,uuid)') IS NOT NULL THEN
    RAISE EXCEPTION 'Fundacao de cotacao ja existe; verificar em vez de reaplicar.';
  END IF;
  IF to_regclass('public.products') IS NULL OR to_regclass('public.settings') IS NULL
     OR to_regclass('public.cities') IS NULL OR to_regclass('public.coupons') IS NULL
     OR to_regclass('public.orders') IS NULL THEN
    RAISE EXCEPTION 'Estrutura obrigatoria ausente.';
  END IF;
  IF (SELECT count(*) FROM information_schema.columns
      WHERE table_schema = 'public' AND
        (table_name, column_name, data_type) IN (
          ('products','id','uuid'), ('products','name','text'), ('products','price','numeric'),
          ('products','available','boolean'), ('cities','id','uuid'), ('cities','name','text'),
          ('cities','active','boolean'), ('settings','key','text'), ('settings','value','text'),
          ('coupons','id','uuid'), ('coupons','code','text'), ('coupons','discount','integer'),
          ('coupons','usage_count','integer'), ('coupons','usage_limit','integer'),
          ('coupons','valid_from','date'), ('coupons','valid_to','date'),
          ('coupons','active','boolean'), ('coupons','user_id','uuid'),
          ('coupons','is_pending_admin_approval','boolean'), ('coupons','type','text'))
      ) <> 20 THEN
    RAISE EXCEPTION 'Colunas de produtos, cidades, configuracoes ou cupons diferentes do diagnostico.';
  END IF;
END;
$preflight$;

CREATE TABLE public.order_quotes (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  items jsonb NOT NULL,
  subtotal numeric(12,2) NOT NULL CHECK (subtotal >= 0),
  delivery_fee numeric(12,2) NOT NULL CHECK (delivery_fee >= 0),
  discount_amount numeric(12,2) NOT NULL CHECK (discount_amount >= 0),
  total numeric(12,2) NOT NULL CHECK (total >= 0),
  delivery_type text NOT NULL CHECK (delivery_type IN ('delivery', 'pickup')),
  payment_method text NOT NULL CHECK (payment_method IN ('cash', 'pix', 'card')),
  city_id uuid REFERENCES public.cities(id),
  city_name text,
  coupon_id uuid REFERENCES public.coupons(id),
  coupon_code text,
  coupon_discount integer,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  CHECK (jsonb_typeof(items) = 'array'),
  CHECK (expires_at > created_at),
  CHECK ((delivery_type = 'pickup' AND city_id IS NULL AND city_name IS NULL AND delivery_fee = 0)
      OR (delivery_type = 'delivery' AND city_id IS NOT NULL AND city_name IS NOT NULL)),
  CHECK ((coupon_id IS NULL AND coupon_code IS NULL AND coupon_discount IS NULL AND discount_amount = 0)
      OR (coupon_id IS NOT NULL AND coupon_code IS NOT NULL AND coupon_discount BETWEEN 1 AND 100))
);

CREATE INDEX order_quotes_live_coupon_idx
  ON public.order_quotes (coupon_id, expires_at)
  WHERE coupon_id IS NOT NULL AND consumed_at IS NULL;
CREATE INDEX order_quotes_user_created_idx
  ON public.order_quotes (user_id, created_at DESC);

ALTER TABLE public.order_quotes ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.order_quotes FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.order_quotes TO service_role;

CREATE FUNCTION public.prepare_order_quote(
  p_request_id uuid,
  p_items jsonb,
  p_delivery_type text,
  p_payment_method text,
  p_city_name text DEFAULT NULL,
  p_coupon_id uuid DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $quote$
DECLARE
  v_user_id uuid := auth.uid();
  v_existing public.order_quotes%ROWTYPE;
  v_quote public.order_quotes%ROWTYPE;
  v_line jsonb;
  v_product public.products%ROWTYPE;
  v_coupon public.coupons%ROWTYPE;
  v_city public.cities%ROWTYPE;
  v_items jsonb := '[]'::jsonb;
  v_quantity integer;
  v_observations text;
  v_subtotal numeric(12,2) := 0;
  v_fee numeric(12,2) := 0;
  v_discount numeric(12,2) := 0;
  v_reserved bigint := 0;
  v_setting text;
  v_free_delivery boolean := false;
BEGIN
  IF v_user_id IS NULL OR p_request_id IS NULL THEN
    RAISE EXCEPTION 'Authenticated user and request ID are required' USING ERRCODE = '42501';
  END IF;

  -- Serializa repeticoes do mesmo UUID antes de calcular ou reservar capacidade.
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_request_id::text, 0));

  SELECT * INTO v_existing FROM public.order_quotes WHERE id = p_request_id;
  IF FOUND THEN
    IF v_existing.user_id IS DISTINCT FROM v_user_id THEN
      RAISE EXCEPTION 'Request is not accessible to this user' USING ERRCODE = '42501';
    END IF;
    RETURN jsonb_build_object('quote', to_jsonb(v_existing), 'created', false);
  END IF;

  IF jsonb_typeof(p_items) IS DISTINCT FROM 'array' OR jsonb_array_length(p_items) NOT BETWEEN 1 AND 50 THEN
    RAISE EXCEPTION 'Order items must be an array with 1 to 50 lines' USING ERRCODE = '22023';
  END IF;
  IF p_delivery_type NOT IN ('delivery', 'pickup') OR p_payment_method NOT IN ('cash', 'pix', 'card') THEN
    RAISE EXCEPTION 'Invalid delivery or payment method' USING ERRCODE = '22023';
  END IF;

  FOR v_line IN SELECT value FROM jsonb_array_elements(p_items) LOOP
    BEGIN
      v_quantity := (v_line->>'quantity')::integer;
      SELECT * INTO STRICT v_product FROM public.products
      WHERE id = (v_line->>'product_id')::uuid AND available IS TRUE;
    EXCEPTION WHEN invalid_text_representation OR no_data_found THEN
      RAISE EXCEPTION 'Unavailable or invalid product' USING ERRCODE = '22023';
    END;
    IF v_quantity NOT BETWEEN 1 AND 99 OR (v_line->>'quantity') !~ '^[0-9]+$' THEN
      RAISE EXCEPTION 'Quantity must be an integer from 1 to 99' USING ERRCODE = '22023';
    END IF;
    v_observations := nullif(btrim(v_line->>'observations'), '');
    IF length(v_observations) > 500 THEN
      RAISE EXCEPTION 'Observations are too long' USING ERRCODE = '22023';
    END IF;
    v_subtotal := v_subtotal + round(v_product.price * v_quantity, 2);
    v_items := v_items || jsonb_build_array(jsonb_strip_nulls(jsonb_build_object(
      'product_id', v_product.id, 'name', v_product.name,
      'quantity', v_quantity, 'price', v_product.price,
      'observations', v_observations)));
  END LOOP;

  IF p_delivery_type = 'delivery' THEN
    IF nullif(btrim(p_city_name), '') IS NULL THEN
      RAISE EXCEPTION 'Active delivery city is required' USING ERRCODE = '22023';
    END IF;
    SELECT * INTO v_city FROM public.cities
      WHERE active IS TRUE AND lower(btrim(name)) = lower(btrim(p_city_name));
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Delivery city is unavailable' USING ERRCODE = '22023';
    END IF;

    SELECT value INTO v_setting FROM public.settings WHERE key = 'valentine_theme_active';
    IF v_setting IS NOT NULL AND lower(btrim(v_setting)) NOT IN ('true', 'false') THEN
      RAISE EXCEPTION 'Invalid free-delivery setting' USING ERRCODE = '22023';
    END IF;
    v_free_delivery := coalesce(lower(btrim(v_setting)) = 'true', false)
      AND lower(v_city.name) NOT LIKE '%comandatuba%';
    IF NOT v_free_delivery THEN
      SELECT value INTO v_setting FROM public.settings
      WHERE key = CASE WHEN lower(v_city.name) LIKE '%comandatuba%'
        THEN 'comandatuba_delivery_fee' ELSE 'delivery_fee' END;
      IF v_setting IS NULL OR btrim(v_setting) !~ '^[0-9]+([.][0-9]{1,2})?$' THEN
        RAISE EXCEPTION 'Invalid delivery fee setting' USING ERRCODE = '22023';
      END IF;
      v_fee := round(v_setting::numeric, 2);
    END IF;
  END IF;

  IF p_coupon_id IS NOT NULL THEN
    SELECT * INTO v_coupon FROM public.coupons WHERE id = p_coupon_id FOR UPDATE;
    IF NOT FOUND OR v_coupon.active IS NOT TRUE OR v_coupon.is_pending_admin_approval IS TRUE
       OR v_coupon.valid_from > (clock_timestamp() AT TIME ZONE 'America/Sao_Paulo')::date
       OR v_coupon.valid_to < (clock_timestamp() AT TIME ZONE 'America/Sao_Paulo')::date
       OR (v_coupon.user_id IS NOT NULL AND v_coupon.user_id <> v_user_id)
       OR (v_coupon.user_id IS NULL AND v_coupon.type IN ('birthday', 'loyalty')) THEN
      RAISE EXCEPTION 'Coupon is unavailable for this order' USING ERRCODE = '22023';
    END IF;
    SELECT count(*) INTO v_reserved FROM public.order_quotes
      WHERE coupon_id = p_coupon_id AND consumed_at IS NULL AND expires_at > clock_timestamp();
    IF v_coupon.usage_limit IS NOT NULL
       AND coalesce(v_coupon.usage_count, 0) + v_reserved >= v_coupon.usage_limit THEN
      RAISE EXCEPTION 'Coupon usage limit reached' USING ERRCODE = '22023';
    END IF;
    v_discount := round(v_subtotal * v_coupon.discount / 100.0, 2);
  END IF;

  INSERT INTO public.order_quotes (
    id, user_id, items, subtotal, delivery_fee, discount_amount, total,
    delivery_type, payment_method, city_id, city_name,
    coupon_id, coupon_code, coupon_discount, expires_at
  ) VALUES (
    p_request_id, v_user_id, v_items, v_subtotal, v_fee, v_discount,
    greatest(v_subtotal + v_fee - v_discount, 0), p_delivery_type, p_payment_method,
    v_city.id, v_city.name, v_coupon.id, v_coupon.code, v_coupon.discount,
    clock_timestamp() + interval '2 hours'
  ) RETURNING * INTO v_quote;

  RETURN jsonb_build_object('quote', to_jsonb(v_quote), 'created', true);
END;
$quote$;

ALTER FUNCTION public.prepare_order_quote(uuid,jsonb,text,text,text,uuid) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.prepare_order_quote(uuid,jsonb,text,text,text,uuid)
  FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.prepare_order_quote(uuid,jsonb,text,text,text,uuid)
  TO authenticated;

NOTIFY pgrst, 'reload schema';
COMMIT;
