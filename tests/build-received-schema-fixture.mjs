// Gera apenas a fixture local a partir dos metadados enviados pelo usuário.
// Não conecta a serviços externos nem executa SQL.
import { readFileSync, writeFileSync } from 'node:fs';
const metadata = JSON.parse(readFileSync(new URL('./order-schema.received.json', import.meta.url), 'utf8').replace(/^\uFEFF/, ''));
const dependencies = JSON.parse(readFileSync(new URL('./order-dependencies.received.json', import.meta.url), 'utf8').replace(/^\uFEFF/, ''));
const base = readFileSync(new URL('./order-schema.fixture.sql', import.meta.url), 'utf8');
const identifier = value => `"${value.replaceAll('"', '""')}"`;
const types = { uuid: 'uuid', text: 'text', int4: 'integer', date: 'date', bool: 'boolean', timestamptz: 'timestamptz', jsonb: 'jsonb', numeric: 'numeric' };
let sql = '-- TESTE LOCAL DESCARTÁVEL. Não executar no Supabase real.\n';
sql += '-- Reproduz os dois exports de metadados; auth e os dados são fictícios.\n';
sql += base.slice(base.indexOf('CREATE ROLE anon;'), base.indexOf('CREATE TABLE public.orders'));
sql += 'CREATE ROLE service_role;\n';
if (dependencies['05_gatilhos_cupom'].length || dependencies['06_enums'].length) {
  throw new Error('Triggers ou enums novos exigem revisão antes de gerar a fixture.');
}
const sequence = dependencies['04_sequencia'][0];
if (dependencies['04_sequencia'].length !== 1 || sequence.nome !== 'orders_order_number_seq' || sequence.tipo !== 'bigint') {
  throw new Error('Sequência diferente da revisada.');
}
// O export arredondou o máximo bigint para 9223372036854776000. Não o emitir:
// NO MAXVALUE usa o limite exato do PostgreSQL; estado/valor atual não são copiados.
if (sequence.maximo !== Number('9223372036854775807')) throw new Error('Máximo de sequência não revisado.');
sql += `CREATE SEQUENCE public.orders_order_number_seq AS bigint INCREMENT BY ${sequence.incremento} MINVALUE ${sequence.minimo} NO MAXVALUE CACHE ${sequence.cache} ${sequence.ciclo ? 'CYCLE' : 'NO CYCLE'};\n`;
for (const acl of sequence.permissoes) {
  const [, role, privileges] = /^(.*?)=([rwU]*)\//.exec(acl) || [];
  if (role === undefined) throw new Error(`ACL de sequência não revisada: ${acl}`);
  const names = [...privileges].map(privilege => ({ r: 'SELECT', w: 'UPDATE', U: 'USAGE' })[privilege]);
  if (names.length) sql += `GRANT ${names.join(', ')} ON SEQUENCE public.orders_order_number_seq TO ${role ? identifier(role) : 'PUBLIC'};\n`;
}
const profile = dependencies['01_profiles'];
for (const table of ['profiles', 'coupons', 'orders']) {
  const columns = (table === 'profiles' ? profile.colunas : metadata['01_colunas'].filter(column => column.table_name === table)).slice().sort((a, b) => a.ordinal_position - b.ordinal_position);
  if (!columns.length) throw new Error(`Tabela ausente: ${table}`);
  sql += `CREATE TABLE public.${identifier(table)} (\n` + columns.map(column => {
    if (!types[column.udt_name]) throw new Error(`Tipo não revisado: ${column.udt_name}`);
    return `  ${identifier(column.column_name)} ${types[column.udt_name]}${column.column_default ? ` DEFAULT ${column.column_default}` : ''}${column.is_nullable === 'NO' ? ' NOT NULL' : ''}`;
  }).join(',\n') + '\n);\n';
}
const constraints = dependencies['02_restricoes'];
for (const constraint of [...constraints].sort((a, b) => Number(a.tipo === 'f') - Number(b.tipo === 'f'))) {
  if (!['orders', 'coupons', 'profiles'].includes(constraint.tabela)) throw new Error('Tabela de constraint não revisada.');
  sql += `ALTER TABLE public.${identifier(constraint.tabela)} ADD CONSTRAINT ${identifier(constraint.nome)} ${constraint.definicao}${constraint.validada ? '' : ' NOT VALID'};\n`;
}
for (const index of [...metadata['02_indices'], ...profile.indices.map(index => ({ ...index, tablename: 'profiles' }))]) {
  if (!constraints.some(constraint => constraint.tabela === index.tablename && constraint.nome === index.indexname && ['p', 'u', 'x'].includes(constraint.tipo))) sql += index.indexdef + ';\n';
}
const roleFunction = dependencies['03_get_my_role'].find(fn => fn.nome === 'get_my_role' && fn.argumentos === '');
if (!roleFunction || roleFunction.proprietario !== 'postgres') throw new Error('Helper de perfil não revisado.');
sql += roleFunction.definicao + ';\n';
for (const acl of roleFunction.permissoes) {
  const [, role] = /^(.*?)=X\//.exec(acl) || [];
  if (role === undefined) throw new Error('ACL do helper não revisada.');
  sql += `GRANT EXECUTE ON FUNCTION public.get_my_role() TO ${role ? identifier(role) : 'PUBLIC'};\n`;
}
for (const grant of metadata['05_privilegios']) sql += `GRANT ${grant.privilege_type} ON public.${identifier(grant.table_name)} TO ${identifier(grant.grantee)};\n`;
for (const grant of profile.grants) sql += `GRANT ${grant.privilege_type} ON public.profiles TO ${identifier(grant.grantee)};\n`;
for (const schema of dependencies['07_acesso_esquemas']) {
  sql += `${schema.authenticated_usage ? 'GRANT' : 'REVOKE'} USAGE ON SCHEMA ${identifier(schema.esquema)} ${schema.authenticated_usage ? 'TO' : 'FROM'} authenticated;\n`;
}
for (const table of [...metadata['04_rls'], { relname: 'profiles', relrowsecurity: profile.rls.enabled, relforcerowsecurity: profile.rls.forced }]) {
  if (table.relrowsecurity) sql += `ALTER TABLE public.${identifier(table.relname)} ENABLE ROW LEVEL SECURITY;\n`;
  if (table.relforcerowsecurity) sql += `ALTER TABLE public.${identifier(table.relname)} FORCE ROW LEVEL SECURITY;\n`;
}
for (const policy of [...metadata['03_politicas'], ...profile.politicas.map(policy => ({ ...policy, tablename: 'profiles' }))]) {
  sql += `CREATE POLICY ${identifier(policy.policyname)} ON public.${identifier(policy.tablename)} FOR ${policy.cmd} TO ${policy.roles.map(identifier).join(', ')}${policy.qual ? ` USING (${policy.qual})` : ''}${policy.with_check ? ` WITH CHECK (${policy.with_check})` : ''};\n`;
}
sql += metadata['06_funcoes'].find(fn => fn.proname === 'increment_coupon_usage').definition + ';\n';
sql += '\nGRANT EXECUTE ON FUNCTION public.increment_coupon_usage(uuid) TO PUBLIC, anon, authenticated, service_role;\n';
sql += `INSERT INTO public.profiles (id, role) VALUES
 ('00000000-0000-4000-8000-000000000001', 'customer'),
 ('00000000-0000-4000-8000-000000000002', 'customer');\n`;
sql += `INSERT INTO public.coupons (id, name, code, discount, valid_from, valid_to) VALUES
 ('00000000-0000-4000-8000-000000000010', 'Teste local', 'TESTE', 10, '2026-01-01', '2026-12-31'),
 ('00000000-0000-4000-8000-000000000011', 'Falha local', 'FALHA', 10, '2026-01-01', '2026-12-31');\n`;
sql += base.slice(base.indexOf('CREATE FUNCTION public.fail_test_coupon_update'));
writeFileSync(new URL('./order-schema.received.fixture.sql', import.meta.url), sql);
console.log('Fixture gerada: 37 colunas, 17 políticas, 10 constraints e dependências recebidas. Auth e dados fictícios.');
