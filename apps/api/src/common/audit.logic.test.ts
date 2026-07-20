import assert from 'node:assert/strict';
import { test } from 'node:test';

import { entityIdOf, resolveUpdateAction } from './audit.logic.ts';

test('flipping `active` to false resolves to a deactivate action', () => {
  assert.equal(resolveUpdateAction(['active'], { active: false }), 'deactivate');
});

test('changing other columns resolves to a plain update action', () => {
  assert.equal(resolveUpdateAction(['title', 'departmentId'], { active: true, title: '部長' }), 'update');
});

test('`active` listed as changed but still true is a plain update, not a deactivate', () => {
  assert.equal(resolveUpdateAction(['active'], { active: true }), 'update');
});

test('entityIdOf prefers sysId (employees) over id', () => {
  assert.equal(entityIdOf({ sysId: 'abc123', id: 'should-not-use' }), 'abc123');
});

test('entityIdOf falls back to id (departments, assignments)', () => {
  assert.equal(entityIdOf({ id: '24100' }), '24100');
});

test('entityIdOf throws when the entity has neither sysId nor id', () => {
  assert.throws(() => entityIdOf({ name: 'no identifiers here' }));
});
