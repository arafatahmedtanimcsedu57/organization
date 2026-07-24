import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const webPort = Number(process.env.WEB_PORT) || 5173;
const apiHost = process.env.API_HOST || 'localhost';
const apiPort = Number(process.env.API_PORT) || 3000;

/**
 * Hosts the preview server accepts (Vite 6+ blocks unknown `Host` headers). The api container's
 * Puppeteer PDF renderer navigates to `WEB_BASE_URL` (`http://web:5173`), so the docker service
 * name `web` must be allowed; localhost/127.0.0.1 are always permitted, so host-based E2E is
 * unaffected. Override with `PREVIEW_ALLOWED_HOSTS` (comma-separated) if the service is renamed.
 */
const previewAllowedHosts = (process.env.PREVIEW_ALLOWED_HOSTS ?? 'web')
  .split(',')
  .map((host) => host.trim());

/** Dev/preview proxy: SPA calls `/api/*` (see chartApi's `baseUrl: '/api'`), forwarded to the NestJS api's root-mounted routes (`/chart`, `/chart/warnings`, `/chart/pdf`, ...). */
const apiProxy = {
  '/api': {
    target: `http://${apiHost}:${apiPort}`,
    changeOrigin: true,
    rewrite: (path: string) => path.replace(/^\/api/, ''),
  },
};

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: webPort,
    host: true,
    allowedHosts: previewAllowedHosts,
    proxy: apiProxy,
  },
  preview: {
    port: webPort,
    host: true,
    allowedHosts: previewAllowedHosts,
    proxy: apiProxy,
  },
});
