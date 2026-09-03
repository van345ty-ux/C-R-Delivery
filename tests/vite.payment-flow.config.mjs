import { mergeConfig } from 'vite';
import tailwindcss from 'tailwindcss';
import autoprefixer from 'autoprefixer';
import base from './vite.config.mjs';
import tailwind from '../tailwind.config.js';

export default mergeConfig(base, {
  define: { 'import.meta.env.VITE_ORDER_IDEMPOTENCY_ENABLED': JSON.stringify('true') },
  server: { port: 8086 },
  css: { postcss: { plugins: [tailwindcss({ ...tailwind, content: [...tailwind.content, './tests/payment-flow-check.jsx'] }), autoprefixer()] } },
});
