// @ts-check
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import eslintConfigPrettier from 'eslint-config-prettier';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';

export default tseslint.config(
  {
    ignores: ['**/node_modules/**', '**/dist/**', '**/build/**', '**/*.html'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    },
  },
  // React rules apply to the SPA only - `apps/api` is NestJS and `packages/*` are plain TS.
  // `recommended-latest` is the React team's current baseline: the classic Rules of Hooks and
  // exhaustive-deps, plus the React Compiler's purity/memoization checks.
  {
    files: ['apps/web/**/*.{ts,tsx}'],
    languageOptions: {
      globals: {
        ...globals.browser,
      },
    },
    extends: [reactHooks.configs.flat['recommended-latest']],
  },
  eslintConfigPrettier,
);
