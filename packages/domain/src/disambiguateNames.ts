/**
 * Computes a display name (last name only) for every employee, disambiguating shared
 * last names. Ported from the legacy `src/buildOrg.ts` (`computeDisplayNames`).
 */
import { DISPLAY_OVERRIDES, type Lang } from './config.ts';
import type { Employee } from './model.ts';

/**
 * Rule: if a last name is unique company-wide, show just the last name; otherwise
 * append the first character of the given name in parentheses, e.g. 佐藤(悠) / 佐藤(晃).
 * The `lang` variant of `DISPLAY_OVERRIDES` (keyed by Sys ID) always wins when present;
 * `lang` only selects that variant - the last-name rule is language-agnostic (the
 * "first character of the given name" initial works on kanji and romaji alike).
 */
export function computeDisplayNames(employees: Employee[], lang: Lang = 'ja'): Map<string, string> {
  const lastNameCounts = new Map<string, number>();
  for (const e of employees) {
    lastNameCounts.set(e.lastName, (lastNameCounts.get(e.lastName) ?? 0) + 1);
  }

  const names = new Map<string, string>();
  for (const e of employees) {
    const override = DISPLAY_OVERRIDES[e.sysId]?.[lang];
    if (override) {
      names.set(e.sysId, override);
      continue;
    }
    const collides = (lastNameCounts.get(e.lastName) ?? 0) > 1;
    const suffix = collides && e.firstName ? `(${[...e.firstName][0]})` : '';
    names.set(e.sysId, `${e.lastName}${suffix}`);
  }
  return names;
}
