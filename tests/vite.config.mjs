import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  root: fileURLToPath(new URL('../', import.meta.url)),
  plugins: [react()],
  define: {
    'import.meta.env.VITE_SUPABASE_URL': JSON.stringify('https://supabase.test'),
    'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify('test-only-key'),
    'import.meta.env.VITE_ORDER_IDEMPOTENCY_ENABLED': JSON.stringify(process.env.CR_TEST_ORDER_PROTECTION || 'false'),
  },
  resolve: {
    alias: [{
      find: /.*integrations[\\/]supabase[\\/]client(?:\.ts)?$/,
      replacement: fileURLToPath(new URL('./fixtures/supabase.mjs', import.meta.url)),
    }],
  },
  server: { host: '127.0.0.1', port: 8082, strictPort: true },
});
