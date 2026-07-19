/**
 * Position-rank configuration, ported from the legacy `src/config.ts`.
 *
 * Position hierarchy, highest → lowest, taken from the supplementary reference sheet.
 * The array index is the rank (0 = highest). Anyone at or below `STAFF_RANK` is placed
 * in a department's `staff` roster rather than its `managers` roster.
 *
 * Note: `sys_user` stores "主任２" with a full-width "２", while the legacy chart writes
 * "主任2". Titles are normalized (see `normalizeTitle`) so both map to the same rank.
 */
export const POSITION_RANK: readonly string[] = [
  "代表取締役", // Representative Director
  "本部長", // Division Manager (honbu)
  "事業部長", // Division Manager (jigyoubu)
  "部長", // General Manager
  "課長", // Manager
  "担当課長", // Deputy Manager
  "主任", // Chief
  "主任2", // Chief (second)
  "課員", // Employee
];

/** The rank at and below which people are placed in the wrapped staff grid. */
export const STAFF_RANK = POSITION_RANK.indexOf("課員");

/** Normalize full-width digits so "主任２" === "主任2". */
export function normalizeTitle(title: string): string {
  return title.replace(/[０-９]/g, (d) => String.fromCharCode(d.charCodeAt(0) - 0xfee0));
}

/**
 * Display-name overrides for the handful of hand-made labels the automatic
 * last-name rule cannot derive (e.g. a location tag rather than a given-name initial).
 * Keyed by the person's Sys ID so it is unambiguous. Leave empty to rely purely on
 * the automatic rule. This keeps such tweaks out of the provided masters.
 *
 * Ported from the legacy `src/config.ts`.
 */
export const DISPLAY_OVERRIDES: Readonly<Record<string, string>> = {
  // 隆洋 大西 (主任, SW開発課 2G) is written "大西【大阪】" (Osaka location tag) in the legacy chart.
  "4df2151147314610d1f9cc39116d438f": "大西【大阪】",
};
