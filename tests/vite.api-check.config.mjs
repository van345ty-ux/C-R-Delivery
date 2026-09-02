import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  root: fileURLToPath(new URL('../', import.meta.url)),
  plugins: [react()],
  define: { 'import.meta.env.VITE_ORDER_IDEMPOTENCY_ENABLED': JSON.stringify('false') },
  server: { host: '127.0.0.1', port: 8084, strictPort: true },
});
