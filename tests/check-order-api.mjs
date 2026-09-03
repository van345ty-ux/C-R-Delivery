// Verificação anônima na API configurada em .env; não imprime chaves/sessões.
import { loadEnvFile } from 'node:process';
import { probeOrderApi } from './order-api-probe.mjs';
loadEnvFile(new URL('../.env', import.meta.url));
try {
  const results = await probeOrderApi({ url: process.env.VITE_SUPABASE_URL, key: process.env.VITE_SUPABASE_ANON_KEY });
  for (const result of results) console.log(`${result.ok ? 'OK' : 'REVISAR'}: ${result.name} (HTTP ${result.http}, ${result.code || 'sem código'})`);
  if (results.some(result => !result.ok)) process.exitCode = 1;
} catch (error) {
  console.error('Não foi possível verificar a API:', error?.cause?.code || error?.name || 'erro de conexão');
  process.exitCode = 1;
}
