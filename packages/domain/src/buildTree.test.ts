import assert from "node:assert/strict";
import { test } from 'vitest';

import { buildDepartmentTree } from "./buildTree.ts";
import type { Department } from "./model.ts";

function dept(id: string, name: string, parentName: string, head = ""): Department {
  return { id, name, parentName, head, sysId: id };
}

test("links children to their parent by name and collects empty-parent roots", () => {
  const departments = [
    dept("1", "営業本部", ""),
    dept("2", "営業一課", "営業本部"),
    dept("3", "システム事業部", ""),
    dept("4", "ITサポート事業部", ""),
    dept("5", "管理部", ""),
  ];

  const { roots, warnings, byName, byId } = buildDepartmentTree(departments);

  assert.equal(roots.length, 4);
  assert.deepEqual(
    roots.map((r) => r.name),
    ["営業本部", "システム事業部", "ITサポート事業部", "管理部"],
  );
  assert.equal(warnings.length, 0);

  const eigyouHonbu = byName.get("営業本部");
  assert.ok(eigyouHonbu);
  assert.equal(eigyouHonbu.children.length, 1);
  assert.equal(eigyouHonbu.children[0]?.name, "営業一課");
  assert.equal(byId.get("2"), byName.get("営業一課"));
});

test("a department with an unresolved parent is placed at the top level with a warning", () => {
  const departments = [dept("1", "幽霊課", "存在しない部")];

  const { roots, warnings } = buildDepartmentTree(departments);

  assert.equal(roots.length, 1);
  assert.equal(roots[0]?.name, "幽霊課");
  assert.equal(warnings.length, 1);
  const warning = warnings[0];
  assert.ok(warning);
  assert.equal(warning.kind, "orphan-department");
  assert.match(warning.message, /幽霊課/);
  assert.match(warning.message, /存在しない部/);
});
