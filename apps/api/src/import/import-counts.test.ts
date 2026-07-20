import assert from 'node:assert/strict';
import path from 'node:path';
import { test } from 'vitest';
import { fileURLToPath } from 'node:url';

import { ReadMastersService } from './read-masters.service.ts';
import { SEED_ASSIGNMENTS } from './seed-assignments.data.ts';

/**
 * Verifies the counts the import is expected to produce against the real
 * `TryOutProgram` masters (not fixtures), per spec `data-import`:
 * 20 departments, 4 roots, 95 employees, 3 seeded concurrent assignments.
 */
const sourceDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..', 'TryOutProgram');

test('import counts match the expected masters snapshot', () => {
  const readMasters = new ReadMastersService();
  const departments = readMasters.readDepartments(path.join(sourceDir, 'cmn_department.xlsx'));
  const employees = readMasters.readEmployees(path.join(sourceDir, 'sys_user.xlsx'));
  const roots = departments.filter((d) => d.parentName === '');

  assert.equal(departments.length, 20);
  assert.equal(roots.length, 4);
  assert.equal(employees.length, 95);
  assert.equal(SEED_ASSIGNMENTS.length, 3);
  assert.ok(SEED_ASSIGNMENTS.every((a) => a.type === 'concurrent'));
});
