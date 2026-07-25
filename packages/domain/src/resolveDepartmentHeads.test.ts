import assert from "node:assert/strict";
import { test } from "vitest";

import { buildDepartmentTree } from "./buildTree.ts";
import { CANONICAL_TITLES, findTitleByLabel } from "./config.ts";
import type { Department, Employee } from "./model.ts";
import { placeEmployees } from "./placeMembers.ts";
import { resolveDepartmentHeads } from "./resolveDepartmentHeads.ts";

function dept(id: string, name: string, headSysId?: string, head = ""): Department {
  return { id, name, parentName: "", head, headSysId, sysId: id };
}

function emp(sysId: string, lastName: string, firstName: string, title: string): Employee {
  const titleId = findTitleByLabel(CANONICAL_TITLES, title)?.id ?? title;
  return { sysId, userId: sysId, lastName, firstName, title, titleId, departmentName: "管理部" };
}

test("resolves the head display name from headSysId", () => {
  const tree = buildDepartmentTree([dept("1", "管理部", "a")]);
  const employees = [emp("a", "照沼", "邦義", "部長")];
  placeEmployees(tree, employees, CANONICAL_TITLES);

  const warnings = resolveDepartmentHeads(tree, employees);

  assert.equal(warnings.length, 0);
  assert.equal(tree.byId.get("1")?.head, "邦義 照沼");
});

test("headSysId wins over the legacy free-text head", () => {
  const tree = buildDepartmentTree([dept("1", "管理部", "a", "古い 名前")]);
  const employees = [emp("a", "照沼", "邦義", "部長")];
  placeEmployees(tree, employees, CANONICAL_TITLES);

  resolveDepartmentHeads(tree, employees);

  assert.equal(tree.byId.get("1")?.head, "邦義 照沼");
});

test("a headSysId matching no employee warns and falls back to the legacy text", () => {
  const tree = buildDepartmentTree([dept("1", "管理部", "ghost", "邦義 照沼")]);
  const employees = [emp("a", "山田", "太郎", "課長")];
  placeEmployees(tree, employees, CANONICAL_TITLES);

  const warnings = resolveDepartmentHeads(tree, employees);

  assert.equal(warnings.length, 1);
  assert.equal(warnings[0]?.kind, "unknown-head");
  assert.equal(tree.byId.get("1")?.head, "邦義 照沼");
});

test("with no headSysId, a non-empty legacy head text is kept as-is", () => {
  const tree = buildDepartmentTree([dept("1", "管理部", undefined, "邦義 照沼")]);
  const employees = [emp("a", "山田", "太郎", "課長")];
  placeEmployees(tree, employees, CANONICAL_TITLES);

  const warnings = resolveDepartmentHeads(tree, employees);

  assert.equal(warnings.length, 0);
  assert.equal(tree.byId.get("1")?.head, "邦義 照沼");
});

test("with no headSysId and empty text, derives the head from the top-ranked member", () => {
  const tree = buildDepartmentTree([dept("1", "管理部")]);
  const employees = [emp("a", "山田", "花子", "課員"), emp("b", "佐藤", "一郎", "本部長")];
  placeEmployees(tree, employees, CANONICAL_TITLES);

  const warnings = resolveDepartmentHeads(tree, employees);

  assert.equal(warnings.length, 0);
  // 本部長 outranks 課員, so 佐藤 is derived as the head.
  assert.equal(tree.byId.get("1")?.head, "一郎 佐藤");
});
