// Somente GET no site público informado pelo usuário. Não executa o JavaScript baixado.
import { createHash } from 'node:crypto';
import { loadEnvFile } from 'node:process';
loadEnvFile(new URL('../.env', import.meta.url));
const origin = 'https://cr-sushi.vercel.app';
async function read(path) {
  const url = new URL(path, origin);
  if (url.origin !== origin) throw new Error('O arquivo precisa pertencer ao site informado.');
  const response = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw new Error(`Site retornou HTTP ${response.status}`);
  return response.text();
}
try {
  const html = await read('/');
  const scriptPath = /<script\b[^>]*\bsrc=["']([^"']+)["']/i.exec(html)?.[1];
  if (!scriptPath) throw new Error('Script de entrada não encontrado.');
  const script = await read(scriptPath);
  console.log(JSON.stringify({
    site: origin,
    script: scriptPath,
    sha256: createHash('sha256').update(script).digest('hex'),
    sameSupabaseUrl: Boolean(process.env.VITE_SUPABASE_URL && script.includes(process.env.VITE_SUPABASE_URL)),
    containsSubmitOrderOnce: script.includes('submit_order_once'),
    containsClaimOrderNotification: script.includes('claim_order_notification'),
  }, null, 2));
} catch (error) {
  console.error('Não foi possível conferir a publicação:', error?.cause?.code || error.message);
  process.exitCode = 1;
}
