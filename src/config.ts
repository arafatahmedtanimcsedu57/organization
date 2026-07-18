/**
 * Tunable configuration a maintainer edits — no code changes needed for the common cases.
 *
 * Everything a non-author would reasonably need to adjust (positions, English labels,
 * special-case name labels, file locations, the chart title) lives here.
 */
import { fileURLToPath } from "node:url";
import path from "node:path";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

export const PATHS = {
  sysUser: path.join(rootDir, "data", "sys_user.xlsx"),
  department: path.join(rootDir, "data", "cmn_department.xlsx"),
  assignments: path.join(rootDir, "data", "user_assignments.xlsx"),
  output: path.join(rootDir, "dist", "organization-chart.html"),
} as const;

/** Heading shown at the top of the chart. */
export const CHART_TITLE = "2024年度組織図";

/**
 * Position hierarchy, highest → lowest, taken from the supplementary reference sheet.
 * The array index is the rank (0 = highest). Anyone with the `課員` title (or a title at
 * or below STAFF_RANK) is rendered in the staff grid rather than as a listed manager.
 *
 * Note: sys_user stores "主任２" with a full-width ２, while the legacy chart writes "主任2".
 * Titles are normalized (see normalizeTitle) so both map to the same rank.
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

/** The rank at and below which people are shown in the wrapped staff grid. */
export const STAFF_RANK = POSITION_RANK.indexOf("課員");

/** Normalize full-width digits so "主任２" === "主任2". */
export function normalizeTitle(title: string): string {
  return title.replace(/[０-９]/g, (d) =>
    String.fromCharCode(d.charCodeAt(0) - 0xfee0),
  );
}

/** Optional Japanese → English department labels (from the reference legend). */
export const DEPARTMENT_EN: Readonly<Record<string, string>> = {
  営業本部: "Sales Division",
  システム事業部: "System Division",
  研究開発課: "Research and Development Section",
  システム課: "System Section",
  SW開発課: "Software Development Section",
  ITサポート事業部: "IT Support Division",
  管理部: "Management Department",
};

/**
 * Display-name overrides for the handful of hand-made labels the automatic
 * last-name rule cannot derive (e.g. a location tag rather than a given-name initial).
 * Keyed by the person's Sys ID so it is unambiguous. Leave empty to rely purely on
 * the automatic rule. This keeps such tweaks out of the provided masters.
 */
export const DISPLAY_OVERRIDES: Readonly<Record<string, string>> = {
  // 隆洋 大西 (主任, SW開発課 2G) is written "大西【大阪】" (Osaka location tag) in the legacy chart.
  "4df2151147314610d1f9cc39116d438f": "大西【大阪】",
};
