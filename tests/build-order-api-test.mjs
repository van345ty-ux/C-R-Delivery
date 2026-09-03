// Empacota SDK e rotina real para executar no Linux sem depender de links do node_modules do Windows.
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';
await build({
  entryPoints: [fileURLToPath(new URL('./order-api.integration.mjs', import.meta.url))],
  outfile: fileURLToPath(new URL('../dist/order-api.integration.mjs', import.meta.url)),
  bundle: true,
  platform: 'node',
  format: 'esm',
  banner: { js: 'import { createRequire as createTestRequire } from "node:module"; const require = createTestRequire(import.meta.url);' },
});
console.log('Teste de integração empacotado em dist/order-api.integration.mjs');
