import assert from "node:assert/strict";
import { test } from 'vitest';

import { buildDepartmentTree } from "./buildTree.ts";
import { CANONICAL_TITLES, findTitleByLabel } from "./config.ts";
import type { Assignment, Department, Employee } from "./model.ts";
import { placeAssignments } from "./placeAssignments.ts";
import { placeEmployees } from "./placeMembers.ts";

function dept(id: string, name: string, parentName: string): Department {
  return { id, name, parentName, head: "", sysId: id };
}

/** Resolve a title label to its managed id (or keep the raw label when unknown). */
function tid(label: string): string {
  return findTitleByLabel(CANONICAL_TITLES, label)?.id ?? label;
}

function emp(sysId: string, lastName: string, title: string, departmentName: string): Employee {
  return { sysId, userId: sysId, lastName, firstName: "", title, titleId: tid(title), departmentName };
}

function concurrent(employeeSysId: string, departmentId: string, title: string): Assignment {
  return { employeeSysId, departmentId, title, titleId: tid(title), type: "concurrent" };
}

test("a concurrent assignment places the person in the target department carrying their home dept + title", () => {
  const tree = buildDepartmentTree([
    dept("1", "ITサポート事業部", ""),
    dept("2", "購買調達部", "ITサポート事業部"),
  ]);
  const employees = [emp("a", "照沼", "事業部長", "ITサポート事業部")];
  const assignments: Assignment[] = [concurrent("a", "2", "部長")];

  placeEmployees(tree, employees, CANONICAL_TITLES);
  const warnings = placeAssignments(tree, employees, assignments, CANONICAL_TITLES);

  assert.equal(warnings.length, 0);
  const home = tree.byName.get("ITサポート事業部");
  const target = tree.byName.get("購買調達部");
  assert.ok(home);
  assert.ok(target);
  assert.equal(home.managers.length, 1);
  assert.equal(home.managers[0]?.concurrent, false);

  assert.equal(target.managers.length, 1);
  const member = target.managers[0];
  assert.ok(member);
  assert.equal(member.concurrent, true);
  assert.equal(member.title, "部長");
  assert.equal(member.sourceDepartmentName, "ITサポート事業部");
  assert.equal(member.sourceTitle, "事業部長");
});

test("primary assignment rows are skipped (placement comes from placeEmployees)", () => {
  const tree = buildDepartmentTree([dept("1", "営業本部", "")]);
  const employees = [emp("a", "山田", "課長", "営業本部")];
  const assignments: Assignment[] = [
    { employeeSysId: "a", departmentId: "1", title: "課長", titleId: tid("課長"), type: "primary" },
  ];

  const warnings = placeAssignments(tree, employees, assignments, CANONICAL_TITLES);

  assert.equal(warnings.length, 0);
  const node = tree.byName.get("営業本部");
  assert.ok(node);
  assert.equal(node.managers.length, 0);
});

test("assignment referencing an unknown employee is reported and skipped", () => {
  const tree = buildDepartmentTree([dept("1", "営業本部", "")]);
  const assignments: Assignment[] = [concurrent("ghost", "1", "部長")];

  const warnings = placeAssignments(tree, [], assignments, CANONICAL_TITLES);

  assert.equal(warnings.length, 1);
  assert.equal(warnings[0]?.kind, "unknown-assignment-user");
});

test("assignment referencing an unknown department is reported and skipped", () => {
  const tree = buildDepartmentTree([dept("1", "営業本部", "")]);
  const employees = [emp("a", "山田", "課長", "営業本部")];
  const assignments: Assignment[] = [concurrent("a", "999", "部長")];

  const warnings = placeAssignments(tree, employees, assignments, CANONICAL_TITLES);

  assert.equal(warnings.length, 1);
  assert.equal(warnings[0]?.kind, "unknown-assignment-department");
});

test("concurrent postings are inserted into the roster in rank order", () => {
  const tree = buildDepartmentTree([dept("1", "購買調達部", "")]);
  const employees = [
    emp("a", "課長A", "課長", "購買調達部"),
    emp("b", "本部長B", "本部長", "他部署"),
  ];
  const assignments: Assignment[] = [concurrent("b", "1", "部長")];

  placeEmployees(tree, employees, CANONICAL_TITLES);
  placeAssignments(tree, employees, assignments, CANONICAL_TITLES);

  const node = tree.byName.get("購買調達部");
  assert.ok(node);
  assert.deepEqual(
    node.managers.map((m) => m.title),
    ["部長", "課長"],
  );
});
