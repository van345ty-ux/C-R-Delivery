-- Fundacao protegida para permitir clientes autenticados fora do horario.
-- O estado inicial e "none": nenhuma liberacao muda ao aplicar esta migracao.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';

DO $$
BEGIN
  IF to_regclass('public.after_hours_access_config') IS NOT NULL
     OR to_regclass('public.after_hours_access_members') IS NOT NULL
     OR to_regprocedure('public.set_after_hours_access(text,uuid[])') IS NOT NULL
     OR to_regprocedure('public.get_my_after_hours_access()') IS NOT NULL THEN
    RAISE EXCEPTION 'A estrutura de acesso fora do horario ja existe ou esta incompleta.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_class WHERE oid='public.profiles'::regclass
      AND relrowsecurity AND pg_get_userbyid(relowner)='postgres') THEN
    RAISE EXCEPTION 'Tabela profiles diferente da estrutura revisada.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE oid=to_regprocedure('public.get_my_role()')
      AND prosecdef AND pg_get_userbyid(proowner)='postgres'
      AND md5(replace(prosrc,E'\r\n',E'\n'))='28d207c13320a2e35cada3ca9a4f68bc') THEN
    RAISE EXCEPTION 'Funcao get_my_role diferente da versao revisada.';
  END IF;
END;
$$;

CREATE TABLE public.after_hours_access_config (
  singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton),
  mode text NOT NULL DEFAULT 'none' CHECK (mode IN ('none','selected','all')),
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL
);

CREATE TABLE public.after_hours_access_members (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL
);

INSERT INTO public.after_hours_access_config(singleton,mode) VALUES (true,'none');

ALTER TABLE public.after_hours_access_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.after_hours_access_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage after hours config"
ON public.after_hours_access_config FOR ALL TO authenticated
USING (public.get_my_role()='admin') WITH CHECK (public.get_my_role()='admin');

CREATE POLICY "Admins manage after hours members"
ON public.after_hours_access_members FOR ALL TO authenticated
USING (public.get_my_role()='admin') WITH CHECK (public.get_my_role()='admin');

REVOKE ALL ON public.after_hours_access_config FROM PUBLIC,anon;
REVOKE ALL ON public.after_hours_access_members FROM PUBLIC,anon;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.after_hours_access_config TO authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.after_hours_access_members TO authenticated;
GRANT ALL ON public.after_hours_access_config TO service_role;
GRANT ALL ON public.after_hours_access_members TO service_role;

CREATE FUNCTION public.set_after_hours_access(p_mode text,p_user_ids uuid[] DEFAULT ARRAY[]::uuid[])
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_user_ids uuid[];
  v_invalid_count integer;
BEGIN
  IF v_user_id IS NULL OR public.get_my_role() IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'Administrator access is required' USING ERRCODE='42501';
  END IF;
  IF p_mode IS NULL OR p_mode NOT IN ('none','selected','all') THEN
    RAISE EXCEPTION 'Invalid after-hours access mode' USING ERRCODE='22023';
  END IF;

  SELECT coalesce(array_agg(DISTINCT id ORDER BY id),ARRAY[]::uuid[])
    INTO v_user_ids FROM unnest(coalesce(p_user_ids,ARRAY[]::uuid[])) AS ids(id);
  IF p_mode='selected' AND cardinality(v_user_ids)=0 THEN
    RAISE EXCEPTION 'Select at least one customer' USING ERRCODE='22023';
  END IF;
  SELECT count(*) INTO v_invalid_count FROM unnest(v_user_ids) ids(id)
    LEFT JOIN public.profiles p ON p.id=ids.id AND p.role='customer'
    WHERE p.id IS NULL;
  IF v_invalid_count>0 THEN
    RAISE EXCEPTION 'The selection contains an invalid customer' USING ERRCODE='22023';
  END IF;

  INSERT INTO public.after_hours_access_config(singleton,mode,updated_at,updated_by)
  VALUES(true,p_mode,clock_timestamp(),v_user_id)
  ON CONFLICT(singleton) DO UPDATE SET mode=excluded.mode,
    updated_at=excluded.updated_at,updated_by=excluded.updated_by;
  DELETE FROM public.after_hours_access_members WHERE user_id IS NOT NULL;
  IF p_mode='selected' THEN
    INSERT INTO public.after_hours_access_members(user_id,created_by)
    SELECT id,v_user_id FROM unnest(v_user_ids) ids(id);
  END IF;
  RETURN jsonb_build_object('mode',p_mode,'selected_count',
    CASE WHEN p_mode='selected' THEN cardinality(v_user_ids) ELSE 0 END);
END;
$function$;

CREATE FUNCTION public.get_my_after_hours_access()
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_mode text;
BEGIN
  IF v_user_id IS NULL THEN RETURN false; END IF;
  SELECT mode INTO v_mode FROM public.after_hours_access_config WHERE singleton;
  RETURN coalesce(v_mode='all' OR (v_mode='selected' AND EXISTS(
    SELECT 1 FROM public.after_hours_access_members WHERE user_id=v_user_id)),false);
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.set_after_hours_access(text,uuid[]) FROM PUBLIC,anon;
REVOKE EXECUTE ON FUNCTION public.get_my_after_hours_access() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.set_after_hours_access(text,uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_after_hours_access() TO authenticated;

NOTIFY pgrst,'reload schema';
COMMIT;
