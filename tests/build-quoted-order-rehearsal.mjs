import { readFileSync, writeFileSync } from 'node:fs';
const source = new URL('../supabase/migrations/202609050002_submit_quoted_order.sql', import.meta.url);
const target = new URL('../supabase/ENSAIAR_CONFIRMACAO_COTACAO.sql', import.meta.url);
const migration = readFileSync(source, 'utf8');
const ending = "NOTIFY pgrst, 'reload schema';\nCOMMIT;\n";
if (!migration.endsWith(ending)) throw new Error('Final inesperado');
const checks = String.raw`DO $verify$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_proc
      WHERE oid='public.submit_quoted_order_once(uuid,jsonb)'::regprocedure
        AND prosecdef AND proconfig=ARRAY['search_path=""']
        AND pg_get_userbyid(proowner)='postgres') THEN
    RAISE EXCEPTION 'Confirmacao sem protecao esperada';
  END IF;
  IF has_function_privilege('anon','public.submit_quoted_order_once(uuid,jsonb)','EXECUTE')
     OR NOT has_function_privilege('authenticated','public.submit_quoted_order_once(uuid,jsonb)','EXECUTE') THEN
    RAISE EXCEPTION 'Permissoes da confirmacao incorretas';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger
      WHERE tgrelid='public.orders'::regclass AND tgname='count_coupon_on_order_insert'
        AND tgenabled='O' AND tgfoid='public.count_coupon_on_order_insert()'::regprocedure) THEN
    RAISE EXCEPTION 'Gatilho de cupom ausente/inativo';
  END IF;
  IF md5(replace(pg_get_functiondef('public.submit_order_once(uuid,jsonb,uuid)'::regprocedure), E'\r\n', E'\n'))
       <> 'e6ad398b86262a9dea3ab58071fb1b04' THEN
    RAISE EXCEPTION 'Funcao anterior de pedido foi alterada';
  END IF;
END;
$verify$;
ROLLBACK;
SELECT 'Ensaio da confirmacao de cotacao concluido. Todas as alteracoes desta transacao foram desfeitas.' AS resultado;
`;
writeFileSync(target, migration.slice(0, -ending.length) + checks, 'utf8');
console.log('ENSAIAR_CONFIRMACAO_COTACAO.sql gerado.');
