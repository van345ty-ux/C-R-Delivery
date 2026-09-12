import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import dyadComponentTagger from '@dyad-sh/react-vite-component-tagger';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [dyadComponentTagger(), react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  server: {
    port: 8081, // Define a porta do servidor de desenvolvimento para 8081
    proxy: {
      '/api/n8n-health': {
        target: 'https://n8n.meuapp-on.online',
        changeOrigin: true,
        secure: true,
        rewrite: path => path.replace(/^\/api\/n8n-health/, '/healthz'),
      },
    },
  },
});
