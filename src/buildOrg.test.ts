/**
 * Unit tests for the domain core. Run with `npm test`.
 * Uses small inline fixtures so the logic (tree, ordering, disambiguation, kenmu,
 * validation warnings) is exercised independently of the real xlsx data.
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { buildOrg } from "./buildOrg.ts";
import type { AssignmentRow, DepartmentRow, UserRow } from "./model.ts";

const depts: DepartmentRow[] = [
  { id: "1", name: "本部", parent: "", head: "山田 太郎", sysId: "d1" },
  { id: "2", name: "営業課", parent: "本部", head: "佐藤 一郎", sysId: "d2" },
  { id: "3", name: "開発課", parent: "本部", head: "佐藤 二郎", sysId: "d3" },
];

const users: UserRow[] = [
  { lastName: "山田", firstName: "太郎", title: "本部長", department: "本部", userId: "1", sysId: "u1" },
  { lastName: "佐藤", firstName: "一郎", title: "課長", department: "営業課", userId: "2", sysId: "u2" },
  { lastName: "佐藤", firstName: "二郎", title: "課員", department: "開発課", userId: "3", sysId: "u3" },
  { lastName: "鈴木", firstName: "花子", title: "主任", department: "営業課", userId: "4", sysId: "u4" },
];

test("builds the department tree with the correct root and children", () => {
  const { roots } = buildOrg(depts, users, []);
  assert.equal(roots.length, 1);
  assert.equal(roots[0]!.name, "本部");
  assert.deepEqual(
    roots[0]!.children.map((c) => c.name).sort(),
    ["営業課", "開発課"],
  );
});

test("orders roster by position rank and splits managers vs. staff", () => {
  const { roots } = buildOrg(depts, users, []);
  const eigyo = roots[0]!.children.find((c) => c.name === "営業課")!;
  // 課長 (rank 4) before 主任 (rank 6); neither is 課員 so both are managers.
  assert.deepEqual(eigyo.managers.map((m) => m.title), ["課長", "主任"]);
  assert.equal(eigyo.staff.length, 0);

  const kaihatsu = roots[0]!.children.find((c) => c.name === "開発課")!;
  assert.equal(kaihatsu.managers.length, 0);
  assert.deepEqual(kaihatsu.staff.map((m) => m.displayName), ["佐藤(二)"]);
});

test("disambiguates shared last names with the given-name initial", () => {
  const { roots } = buildOrg(depts, users, []);
  const eigyo = roots[0]!.children.find((c) => c.name === "営業課")!;
  const kaihatsu = roots[0]!.children.find((c) => c.name === "開発課")!;
  // 佐藤 collides company-wide -> becomes 佐藤(一)/佐藤(二); 鈴木/山田 are unique.
  assert.equal(eigyo.managers.find((m) => m.title === "課長")!.displayName, "佐藤(一)");
  assert.equal(kaihatsu.staff[0]!.displayName, "佐藤(二)");
  assert.equal(eigyo.managers.find((m) => m.title === "主任")!.displayName, "鈴木");
});

test("places concurrent (兼務) assignments and marks them", () => {
  const assignments: AssignmentRow[] = [
    { userSysId: "u2", departmentId: "3", title: "主任", type: "concurrent" },
  ];
  const { roots, stats } = buildOrg(depts, users, assignments);
  const kaihatsu = roots[0]!.children.find((c) => c.name === "開発課")!;
  const kenmu = kaihatsu.managers.find((m) => m.concurrent);
  assert.ok(kenmu, "expected a concurrent member in 開発課");
  assert.equal(kenmu!.displayName, "佐藤(一)");
  assert.equal(kenmu!.title, "主任");
  assert.equal(stats.concurrentEntries, 1);
});

test("warns on an unmatched department and an unknown title", () => {
  const badUsers: UserRow[] = [
    { lastName: "田中", firstName: "実", title: "課員", department: "存在しない課", userId: "9", sysId: "u9" },
    { lastName: "高橋", firstName: "健", title: "顧問", department: "本部", userId: "10", sysId: "u10" },
  ];
  const { warnings } = buildOrg(depts, badUsers, []);
  assert.ok(warnings.some((w) => w.kind === "unmatched-department"));
  assert.ok(warnings.some((w) => w.kind === "unknown-title"));
});

test("normalizes the full-width 主任２ to the same rank as 主任2", () => {
  const u: UserRow[] = [
    { lastName: "阿部", firstName: "彩", title: "主任２", department: "本部", userId: "11", sysId: "u11" },
  ];
  const { roots } = buildOrg(depts, u, []);
  // 主任２ is a manager rank (not 課員), so it lands in managers, not staff.
  assert.equal(roots[0]!.managers.length, 1);
  assert.equal(roots[0]!.staff.length, 0);
});
