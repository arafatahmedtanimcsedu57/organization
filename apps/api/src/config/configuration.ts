import { fileURLToPath } from 'node:url';
import path from 'node:path';

export interface AppConfig {
  port: number;
  database: {
    url: string;
  };
  import: {
    /** Directory containing the provided `sys_user.xlsx` / `cmn_department.xlsx` masters. */
    sourceDir: string;
  };
}

/** Repo root, four levels up from this file (apps/api/src/config -> repo root). */
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..');

export default (): AppConfig => {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is not set');
  }

  return {
    port: Number(process.env.API_PORT) || 3000,
    database: {
      url: databaseUrl,
    },
    import: {
      sourceDir: process.env.IMPORT_SOURCE_DIR || path.join(repoRoot, 'TryOutProgram'),
    },
  };
};
