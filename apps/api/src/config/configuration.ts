import { fileURLToPath } from 'node:url';
import path from 'node:path';

export interface AppConfig {
  port: number;
  database: {
    url: string;
  };
  import: {
    /** Which language dataset to seed, chosen at seed time via `DATA_LANG` (default `ja`). */
    lang: 'ja' | 'en';
    /** Directory containing the `sys_user.xlsx` / `cmn_department.xlsx` masters to seed. */
    sourceDir: string;
  };
  pdf: {
    /** Base URL of the running SPA; Puppeteer navigates to `${webBaseUrl}/chart?print=1`. */
    webBaseUrl: string;
    /** Path to a system Chromium binary (puppeteer-core ships no browser of its own). */
    chromiumExecutablePath?: string;
    timeoutMs: number;
  };
}

/** Repo root, four levels up from this file (apps/api/src/config -> repo root). */
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..');

export default (): AppConfig => {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is not set');
  }

  // `DATA_LANG` picks which committed dataset (`data/ja` or `data/en`) the seed reads;
  // an explicit `IMPORT_SOURCE_DIR` still overrides the resolved directory.
  const lang = process.env.DATA_LANG === 'en' ? 'en' : 'ja';

  return {
    port: Number(process.env.API_PORT) || 3000,
    database: {
      url: databaseUrl,
    },
    import: {
      lang,
      sourceDir: process.env.IMPORT_SOURCE_DIR || path.join(repoRoot, 'data', lang),
    },
    pdf: {
      webBaseUrl: process.env.WEB_BASE_URL || `http://web:${process.env.WEB_PORT || 5173}`,
      chromiumExecutablePath: process.env.PUPPETEER_EXECUTABLE_PATH,
      timeoutMs: Number(process.env.PDF_TIMEOUT_MS) || 30_000,
    },
  };
};
