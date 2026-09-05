-- ENSAIO: cria e valida a nova porta de entrada; nao cria cotacoes nem pedidos.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='30s';

DO $$
BEGIN
  IF to_regprocedure('public.prepare_order_quote_with_access(uuid,jsonb,text,text,text,uuid)') IS NOT NULL THEN
    RAISE EXCEPTION 'A funcao protegida de cotacao ja existe.'; END IF;
  IF NOT EXISTS(SELECT 1 FROM pg_proc
    WHERE oid=to_regprocedure('public.prepare_order_quote(uuid,jsonb,text,text,text,uuid)')
      AND prosecdef AND proconfig=ARRAY['search_path=""']::text[]
      AND md5(replace(prosrc,E'\r\n',E'\n'))='ea315fd892468bd19f4226d038d1211f') THEN
    RAISE EXCEPTION 'Funcao de cotacao anterior diferente da versao revisada.'; END IF;
  IF to_regclass('public.after_hours_access_config') IS NULL
     OR to_regclass('public.after_hours_access_members') IS NULL
     OR to_regprocedure('public.get_my_after_hours_access()') IS NULL THEN
    RAISE EXCEPTION 'A fundacao de acesso fora do horario nao esta completa.'; END IF;
END;
$$;

CREATE FUNCTION public.prepare_order_quote_with_access(
  p_request_id uuid,p_items jsonb,p_delivery_type text,p_payment_method text,
  p_city_name text DEFAULT NULL,p_coupon_id uuid DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $function$
DECLARE
  v_user_id uuid:=auth.uid();
  v_now timestamp:=clock_timestamp() AT TIME ZONE 'America/Sao_Paulo';
  v_day integer; v_time time; v_store_open boolean:=false;
  v_is_comandatuba boolean:=false; v_after_hours_access boolean:=false;
BEGIN
  IF v_user_id IS NULL OR p_request_id IS NULL THEN
    RAISE EXCEPTION 'Authenticated user and request ID are required' USING ERRCODE='42501'; END IF;
  IF EXISTS(SELECT 1 FROM public.order_quotes WHERE id=p_request_id AND user_id=v_user_id) THEN
    RETURN public.prepare_order_quote(p_request_id,p_items,p_delivery_type,p_payment_method,p_city_name,p_coupon_id); END IF;
  IF nullif(btrim(p_city_name),'') IS NULL THEN
    RAISE EXCEPTION 'Selected city is required' USING ERRCODE='22023'; END IF;
  v_day:=extract(dow FROM v_now)::integer; v_time:=v_now::time;
  SELECT EXISTS(SELECT 1 FROM public.operating_hours h
    WHERE h.is_open IS TRUE AND h.open_time IS NOT NULL AND h.close_time IS NOT NULL
      AND h.open_time<>h.close_time AND (
        (h.day_of_week=v_day AND h.open_time<h.close_time AND v_time>=h.open_time AND v_time<h.close_time)
        OR (h.day_of_week=v_day AND h.open_time>h.close_time AND v_time>=h.open_time)
        OR (h.day_of_week=(v_day+6)%7 AND h.open_time>h.close_time AND v_time<h.close_time))) INTO v_store_open;
  v_is_comandatuba:=lower(btrim(p_city_name)) LIKE '%comandatuba%';
  v_after_hours_access:=public.get_my_after_hours_access();
  IF NOT(v_store_open OR v_is_comandatuba OR v_after_hours_access) THEN
    RAISE EXCEPTION 'Store is closed for this customer' USING ERRCODE='42501'; END IF;
  RETURN public.prepare_order_quote(p_request_id,p_items,p_delivery_type,p_payment_method,p_city_name,p_coupon_id);
END;
$function$;
REVOKE EXECUTE ON FUNCTION public.prepare_order_quote_with_access(uuid,jsonb,text,text,text,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.prepare_order_quote_with_access(uuid,jsonb,text,text,text,uuid) TO authenticated;

DO $$
BEGIN
  IF NOT EXISTS(SELECT 1 FROM pg_proc WHERE oid=to_regprocedure(
      'public.prepare_order_quote_with_access(uuid,jsonb,text,text,text,uuid)')
      AND prosecdef AND proconfig=ARRAY['search_path=""']::text[]
      AND position('public.get_my_after_hours_access()' IN prosrc)>0
      AND position('public.operating_hours' IN prosrc)>0
      AND position('public.prepare_order_quote(' IN prosrc)>0) THEN
    RAISE EXCEPTION 'A nova funcao nao contem todas as protecoes esperadas.'; END IF;
  IF has_function_privilege('anon','public.prepare_order_quote_with_access(uuid,jsonb,text,text,text,uuid)','EXECUTE')
     OR NOT has_function_privilege('authenticated','public.prepare_order_quote_with_access(uuid,jsonb,text,text,text,uuid)','EXECUTE') THEN
    RAISE EXCEPTION 'Permissoes incorretas na nova funcao.'; END IF;
  IF NOT EXISTS(SELECT 1 FROM pg_proc
    WHERE oid=to_regprocedure('public.prepare_order_quote(uuid,jsonb,text,text,text,uuid)')
      AND md5(replace(prosrc,E'\r\n',E'\n'))='ea315fd892468bd19f4226d038d1211f') THEN
    RAISE EXCEPTION 'A funcao anterior foi alterada.'; END IF;
END;
$$;

ROLLBACK;
SELECT 'Ensaio da protecao de pedidos fora do horario concluido. Todas as alteracoes desta transacao foram desfeitas.' AS resultado;
