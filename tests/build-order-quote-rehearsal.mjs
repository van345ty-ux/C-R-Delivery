import { readFileSync, writeFileSync } from 'node:fs';

const migrationUrl = new URL('../supabase/migrations/202609050001_order_quote_foundation.sql', import.meta.url);
const rehearsalUrl = new URL('../supabase/ENSAIAR_FUNDACAO_COTACAO.sql', import.meta.url);
const migration = readFileSync(migrationUrl, 'utf8');
const ending = "NOTIFY pgrst, 'reload schema';\nCOMMIT;\n";
if (!migration.endsWith(ending)) throw new Error('Final inesperado da migracao');

const baselineMarker = "SET LOCAL statement_timeout = '30s';\n";
const baseline = String.raw`SELECT set_config(
  'crsushi.quote_rehearsal_submit_hash',
  md5(pg_get_functiondef('public.submit_order_once(uuid,jsonb,uuid)'::regprocedure)),
  true);
SELECT set_config(
  'crsushi.quote_rehearsal_coupon_hash',
  md5(pg_get_functiondef('public.count_coupon_on_order_insert()'::regprocedure)),
  true);
`;

const checks = String.raw`DO $verify$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
      WHERE n.nspname='public' AND c.relname='order_quotes' AND c.relkind='r'
        AND c.relrowsecurity AND NOT c.relforcerowsecurity AND pg_get_userbyid(c.relowner)='postgres') THEN
    RAISE EXCEPTION 'Tabela/RLS/proprietario incorreto';
  END IF;
  IF (SELECT count(*) FROM information_schema.columns
      WHERE table_schema='public' AND table_name='order_quotes') <> 17 THEN
    RAISE EXCEPTION 'Colunas da cotacao incompletas';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_proc
      WHERE oid='public.prepare_order_quote(uuid,jsonb,text,text,text,uuid)'::regprocedure
        AND prosecdef AND proconfig=ARRAY['search_path=""'] AND pg_get_userbyid(proowner)='postgres') THEN
    RAISE EXCEPTION 'Funcao da cotacao sem protecao esperada';
  END IF;
  IF has_function_privilege('anon','public.prepare_order_quote(uuid,jsonb,text,text,text,uuid)','EXECUTE')
     OR NOT has_function_privilege('authenticated','public.prepare_order_quote(uuid,jsonb,text,text,text,uuid)','EXECUTE')
     OR has_table_privilege('anon','public.order_quotes','SELECT')
     OR has_table_privilege('authenticated','public.order_quotes','SELECT') THEN
    RAISE EXCEPTION 'Permissoes da fundacao incorretas';
  END IF;
  IF md5(pg_get_functiondef('public.submit_order_once(uuid,jsonb,uuid)'::regprocedure))
       <> current_setting('crsushi.quote_rehearsal_submit_hash')
     OR md5(pg_get_functiondef('public.count_coupon_on_order_insert()'::regprocedure))
       <> current_setting('crsushi.quote_rehearsal_coupon_hash') THEN
    RAISE EXCEPTION 'Fluxo atual de pedido/cupom divergiu ou foi alterado';
  END IF;
END;
$verify$;
ROLLBACK;
SELECT 'Ensaio da fundacao de cotacao concluido. Todas as alteracoes desta transacao foram desfeitas.' AS resultado;
`;

const withBaseline = migration.replace(baselineMarker, baselineMarker + baseline);
if (withBaseline === migration) throw new Error('Ponto de baseline nao encontrado');
const rehearsal = withBaseline.slice(0, -ending.length) + checks;
writeFileSync(rehearsalUrl, rehearsal, 'utf8');
console.log('ENSAIAR_FUNDACAO_COTACAO.sql gerado.');
