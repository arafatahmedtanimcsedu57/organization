/**
 * Title/position reference data and helpers.
 *
 * Titles are a **managed entity** (persisted in the `titles` table, edited via the
 * Settings UI). This file no longer *defines* the hierarchy - it only carries the
 * canonical seed (`CANONICAL_TITLES`) used to populate a fresh database, plus the
 * language-agnostic helpers (`normalizeTitle`, `findTitleByLabel`) shared by the
 * importer and the build. Rank/ordering at build time comes from the `Title` records
 * passed into `placeEmployees` / `placeAssignments`, not from a compile-time array.
 */
import type { Title } from './model.ts';

/** The language a dataset was seeded in; selected at seed time via `DATA_LANG`. */
export type Lang = 'ja' | 'en';

/**
 * The default position hierarchy, highest → lowest (rank 0 = highest), taken from the
 * supplementary reference sheet. Seeded into the `titles` table for a fresh database;
 * a maintainer can then add/rename/deactivate titles from the Settings UI. `staffLevel`
 * marks the rank-and-file (課員) rendered in the wrapped staff grid. English labels are
 * deliberately **rank-distinct** (the sheet reuses "Division Manager"/"Chief"; here
 * 事業部長 = "Business Unit Manager" and 主任2 = "Senior Chief") so a label alone still
 * resolves to a unique title.
 */
export const CANONICAL_TITLES: readonly Title[] = [
  { id: 'representative-director', name: '代表取締役', nameEn: 'Representative Director', rank: 0, staffLevel: false, active: true },
  { id: 'division-manager', name: '本部長', nameEn: 'Division Manager', rank: 1, staffLevel: false, active: true },
  { id: 'business-unit-manager', name: '事業部長', nameEn: 'Business Unit Manager', rank: 2, staffLevel: false, active: true },
  { id: 'general-manager', name: '部長', nameEn: 'General Manager', rank: 3, staffLevel: false, active: true },
  { id: 'manager', name: '課長', nameEn: 'Manager', rank: 4, staffLevel: false, active: true },
  { id: 'deputy-manager', name: '担当課長', nameEn: 'Deputy Manager', rank: 5, staffLevel: false, active: true },
  { id: 'chief', name: '主任', nameEn: 'Chief', rank: 6, staffLevel: false, active: true },
  { id: 'senior-chief', name: '主任2', nameEn: 'Senior Chief', rank: 7, staffLevel: false, active: true },
  { id: 'employee', name: '課員', nameEn: 'Employee', rank: 8, staffLevel: true, active: true },
];

/** Normalize full-width digits so "主任２" === "主任2". */
export function normalizeTitle(title: string): string {
  return title.replace(/[０-９]/g, (d) => String.fromCharCode(d.charCodeAt(0) - 0xfee0));
}

/**
 * Resolve a raw title label (Japanese canonical or English, full-width digits
 * tolerated) to a managed `Title`. Used by the importer to backfill `title_id` from
 * the master's free-text `Title`, whichever language the dataset was seeded in.
 */
export function findTitleByLabel(titles: readonly Title[], label: string): Title | undefined {
  const norm = normalizeTitle(label).trim();
  return titles.find((t) => normalizeTitle(t.name) === norm || normalizeTitle(t.nameEn) === norm);
}

/**
 * Display-name overrides for the handful of hand-made labels the automatic
 * last-name rule cannot derive (e.g. a location tag rather than a given-name initial).
 * Keyed by the person's Sys ID so it is unambiguous. Leave empty to rely purely on
 * the automatic rule. This keeps such tweaks out of the provided masters.
 *
 * Ported from the legacy `src/config.ts`.
 */
export const DISPLAY_OVERRIDES: Readonly<Record<string, Partial<Record<Lang, string>>>> = {
  // 隆洋 大西 (主任, SW開発課 2G) is written "大西【大阪】" (Osaka location tag) in the legacy chart.
  '4df2151147314610d1f9cc39116d438f': { ja: '大西【大阪】', en: 'Onishi【Osaka】' },
  // Two 山本 (皓太 / 洸太) both romanize to a given name starting "K" (Kota / Kohta),
  // which the automatic initial rule can't disambiguate in English; pin distinct labels.
  // (Japanese needs no override - the distinct kanji initials 皓/洸 already disambiguate.)
  '1532b321c31e821043a51c777a01314c': { en: 'Yamamoto (Kota)' },
  '0a527321c31e821043a51c777a0131d8': { en: 'Yamamoto (Kohta)' },
};
