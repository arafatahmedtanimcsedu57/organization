import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const webPort = Number(process.env.WEB_PORT) || 5173;
const apiHost = process.env.API_HOST || 'localhost';
const apiPort = Number(process.env.API_PORT) || 3000;

/** Dev/preview proxy: SPA calls `/api/*` (see chartApi's `baseUrl: '/api'`), forwarded to the NestJS api's root-mounted routes (`/chart`, `/chart/warnings`, `/chart/pdf`, ...). */
const apiProxy = {
  '/api': {
    target: `http://${apiHost}:${apiPort}`,
    changeOrigin: true,
    rewrite: (path: string) => path.replace(/^\/api/, ''),
  },
};

export default defineConfig({
  plugins: [react()],
  server: {
    port: webPort,
    host: true,
    proxy: apiProxy,
  },
  preview: {
    port: webPort,
    host: true,
    proxy: apiProxy,
  },
});
