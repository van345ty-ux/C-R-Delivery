-- ENSAIO: corrige somente o DELETE da funcao e desfaz ao final.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='30s';

DO $$
BEGIN
  IF NOT EXISTS(SELECT 1 FROM pg_proc
    WHERE oid=to_regprocedure('public.set_after_hours_access(text,uuid[])')
      AND prosecdef AND proconfig=ARRAY['search_path=""']::text[]
      AND pg_get_userbyid(proowner)='postgres'
      AND position('DELETE FROM public.after_hours_access_members;' IN prosrc)>0) THEN
    RAISE EXCEPTION 'Funcao diferente da versao que apresentou o erro. Interrompendo.';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_after_hours_access(p_mode text,p_user_ids uuid[] DEFAULT ARRAY[]::uuid[])
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $function$
DECLARE
  v_user_id uuid:=auth.uid();
  v_user_ids uuid[];
  v_invalid_count integer;
BEGIN
  IF v_user_id IS NULL OR public.get_my_role() IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'Administrator access is required' USING ERRCODE='42501';
  END IF;
  IF p_mode IS NULL OR p_mode NOT IN ('none','selected','all') THEN
    RAISE EXCEPTION 'Invalid after-hours access mode' USING ERRCODE='22023';
  END IF;
  SELECT coalesce(array_agg(DISTINCT id ORDER BY id),ARRAY[]::uuid[]) INTO v_user_ids
    FROM unnest(coalesce(p_user_ids,ARRAY[]::uuid[])) ids(id);
  IF p_mode='selected' AND cardinality(v_user_ids)=0 THEN
    RAISE EXCEPTION 'Select at least one customer' USING ERRCODE='22023';
  END IF;
  SELECT count(*) INTO v_invalid_count FROM unnest(v_user_ids) ids(id)
    LEFT JOIN public.profiles p ON p.id=ids.id AND p.role='customer' WHERE p.id IS NULL;
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

DO $$
BEGIN
  IF NOT EXISTS(SELECT 1 FROM pg_proc
    WHERE oid=to_regprocedure('public.set_after_hours_access(text,uuid[])')
      AND position('DELETE FROM public.after_hours_access_members WHERE user_id IS NOT NULL;' IN prosrc)>0
      AND position('DELETE FROM public.after_hours_access_members;' IN prosrc)=0) THEN
    RAISE EXCEPTION 'A correcao do DELETE nao foi aplicada no ensaio.';
  END IF;
  IF (SELECT mode FROM public.after_hours_access_config WHERE singleton) IS DISTINCT FROM 'none'
     OR EXISTS(SELECT 1 FROM public.after_hours_access_members) THEN
    RAISE EXCEPTION 'O ensaio alterou o estado seguro da configuracao.';
  END IF;
END;
$$;

ROLLBACK;
SELECT 'Ensaio da correcao concluido. Todas as alteracoes desta transacao foram desfeitas.' AS resultado;
