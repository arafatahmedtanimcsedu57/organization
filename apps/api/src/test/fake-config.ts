import type { ConfigService } from '@nestjs/config';
import type { AppConfig } from '../config/configuration.ts';

/**
 * Minimal `ConfigService` stub for unit-wiring services (e.g. `OrgChartService`)
 * without the Nest DI container. Only `import.lang` is consulted; default `ja`.
 */
export function fakeConfigService(lang: 'ja' | 'en' = 'ja'): ConfigService<AppConfig, true> {
  return {
    get: (key: string) => (key === 'import.lang' ? lang : undefined),
  } as unknown as ConfigService<AppConfig, true>;
}
