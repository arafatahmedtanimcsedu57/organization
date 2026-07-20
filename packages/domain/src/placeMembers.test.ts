import assert from "node:assert/strict";
import { test } from 'vitest';

import { buildDepartmentTree } from "./buildTree.ts";
import type { Department, Employee } from "./model.ts";
import { placeEmployees } from "./placeMembers.ts";

function dept(id: string, name: string, parentName: string): Department {
  return { id, name, parentName, head: "", sysId: id };
}

function emp(sysId: string, lastName: string, title: string, departmentName: string): Employee {
  return { sysId, userId: sysId, lastName, firstName: "", title, departmentName };
}

test("orders people within a department from highest to lowest rank", () => {
  const tree = buildDepartmentTree([dept("1", "営業本部", "")]);
  const employees = [
    emp("1", "課員A", "課員", "営業本部"),
    emp("2", "社長", "代表取締役", "営業本部"),
    emp("3", "課長A", "課長", "営業本部"),
  ];

  const warnings = placeEmployees(tree, employees);

  assert.equal(warnings.length, 0);
  const node = tree.byName.get("営業本部");
  assert.ok(node);
  assert.deepEqual(
    node.managers.map((m) => m.title),
    ["代表取締役", "課長"],
  );
  assert.deepEqual(
    node.staff.map((m) => m.title),
    ["課員"],
  );
});

test("splits managers from staff at 課員", () => {
  const tree = buildDepartmentTree([dept("1", "管理部", "")]);
  const employees = [
    emp("1", "主任X", "主任", "管理部"),
    emp("2", "課員X", "課員", "管理部"),
  ];

  placeEmployees(tree, employees);

  const node = tree.byName.get("管理部");
  assert.ok(node);
  assert.equal(node.managers.length, 1);
  assert.equal(node.managers[0]?.title, "主任");
  assert.equal(node.staff.length, 1);
  assert.equal(node.staff[0]?.title, "課員");
});

test("normalizes full-width digits so 主任２ ranks the same as 主任2", () => {
  const tree = buildDepartmentTree([dept("1", "システム事業部", "")]);
  const employees = [emp("1", "田中", "主任２", "システム事業部")];

  const warnings = placeEmployees(tree, employees);

  assert.equal(warnings.length, 0);
  const node = tree.byName.get("システム事業部");
  assert.ok(node);
  assert.equal(node.managers.length, 1);
  assert.equal(node.managers[0]?.rank, 7);
});

test("unknown title is placed last (in staff) and reported as a warning", () => {
  const tree = buildDepartmentTree([dept("1", "ITサポート事業部", "")]);
  const employees = [
    emp("1", "課員B", "課員", "ITサポート事業部"),
    emp("2", "謎の役職", "宇宙飛行士", "ITサポート事業部"),
  ];

  const warnings = placeEmployees(tree, employees);

  assert.equal(warnings.length, 1);
  const warning = warnings[0];
  assert.ok(warning);
  assert.equal(warning.kind, "unknown-title");
  assert.match(warning.message, /宇宙飛行士/);

  const node = tree.byName.get("ITサポート事業部");
  assert.ok(node);
  assert.deepEqual(
    node.staff.map((m) => m.displayName),
    ["課員B", "謎の役職"],
  );
});

test("unique last name is shown plainly", () => {
  const tree = buildDepartmentTree([dept("1", "営業本部", "")]);
  const employees: Employee[] = [
    { sysId: "1", userId: "1", lastName: "濱井", firstName: "太郎", title: "課員", departmentName: "営業本部" },
  ];

  placeEmployees(tree, employees);

  const node = tree.byName.get("営業本部");
  assert.ok(node);
  assert.equal(node.staff[0]?.displayName, "濱井");
});

test("shared last name is disambiguated with the given-name initial", () => {
  const tree = buildDepartmentTree([dept("1", "営業本部", "")]);
  const employees: Employee[] = [
    { sysId: "1", userId: "1", lastName: "佐藤", firstName: "悠介", title: "課員", departmentName: "営業本部" },
    { sysId: "2", userId: "2", lastName: "佐藤", firstName: "晃", title: "課員", departmentName: "営業本部" },
  ];

  placeEmployees(tree, employees);

  const node = tree.byName.get("営業本部");
  assert.ok(node);
  assert.deepEqual(
    node.staff.map((m) => m.displayName).sort(),
    ["佐藤(悠)", "佐藤(晃)"].sort(),
  );
});

test("a configured display override wins over the computed name", () => {
  const tree = buildDepartmentTree([dept("1", "SW開発課 2G", "")]);
  const employees: Employee[] = [
    {
      sysId: "4df2151147314610d1f9cc39116d438f",
      userId: "1",
      lastName: "大西",
      firstName: "隆洋",
      title: "主任",
      departmentName: "SW開発課 2G",
    },
  ];

  placeEmployees(tree, employees);

  const node = tree.byName.get("SW開発課 2G");
  assert.ok(node);
  assert.equal(node.managers[0]?.displayName, "大西【大阪】");
});

test("employee with an unmatched department is skipped and reported as a warning", () => {
  const tree = buildDepartmentTree([dept("1", "営業本部", "")]);
  const employees = [emp("1", "行方不明", "課長", "存在しない部")];

  const warnings = placeEmployees(tree, employees);

  assert.equal(warnings.length, 1);
  const warning = warnings[0];
  assert.ok(warning);
  assert.equal(warning.kind, "unmatched-department");
  assert.match(warning.message, /存在しない部/);
});
