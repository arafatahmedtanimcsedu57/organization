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
