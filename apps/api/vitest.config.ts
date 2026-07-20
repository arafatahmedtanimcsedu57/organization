import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

/** `unplugin-swc` compiles decorators with `emitDecoratorMetadata` so Nest DI and TypeORM entity metadata work under Vitest, mirroring the `@swc-node/register` runtime used by `npm start`. */
export default defineConfig({
  oxc: false,
  plugins: [swc.vite()],
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
});
