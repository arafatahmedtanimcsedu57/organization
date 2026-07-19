import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const webPort = Number(process.env.WEB_PORT) || 5173;

export default defineConfig({
  plugins: [react()],
  server: {
    port: webPort,
    host: true,
  },
  preview: {
    port: webPort,
    host: true,
  },
});
