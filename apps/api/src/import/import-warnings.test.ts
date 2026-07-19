import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Department, Employee } from '@org-chart/domain';

import { findPhantomDepartmentHeadWarnings, findUnmatchedDepartmentWarnings } from './import-warnings.ts';

function employee(overrides: Partial<Employee> = {}): Employee {
  return {
    sysId: 'sys-1',
    userId: '0001',
    lastName: '佐藤',
    firstName: '曠弌',
    title: '代表取締役',
    departmentName: 'システム事業部',
    ...overrides,
  };
}

function department(overrides: Partial<Department> = {}): Department {
  return {
    id: '24500',
    name: 'システム事業部',
    parentName: '',
    head: '',
    sysId: 'dept-sys-1',
    ...overrides,
  };
}

test('an employee whose department has no match is reported as a warning', () => {
  const departmentIdByName = new Map([['システム事業部', '24500']]);
  const employees = [employee({ departmentName: '存在しない部' })];

  const warnings = findUnmatchedDepartmentWarnings(employees, departmentIdByName);

  assert.equal(warnings.length, 1);
  assert.equal(warnings[0]?.kind, 'unmatched-department');
  assert.match(warnings[0]?.message ?? '', /存在しない部/);
});

test('an employee whose department matches produces no warning', () => {
  const departmentIdByName = new Map([['システム事業部', '24500']]);
  const employees = [employee({ departmentName: 'システム事業部' })];

  assert.equal(findUnmatchedDepartmentWarnings(employees, departmentIdByName).length, 0);
});

test('a department head who matches no employee is reported as a phantom-name warning', () => {
  const departments = [department({ head: '芹澤 太郎' })];
  const employees = [employee()];

  const warnings = findPhantomDepartmentHeadWarnings(departments, employees);

  assert.equal(warnings.length, 1);
  assert.equal(warnings[0]?.kind, 'phantom-department-head');
  assert.match(warnings[0]?.message ?? '', /芹澤/);
});

test('a department head matching an employee (First Last, space-separated) produces no warning', () => {
  const departments = [department({ head: '曠弌 佐藤' })];
  const employees = [employee({ lastName: '佐藤', firstName: '曠弌' })];

  assert.equal(findPhantomDepartmentHeadWarnings(departments, employees).length, 0);
});

test('a department with no head produces no warning', () => {
  const departments = [department({ head: '' })];
  const employees = [employee()];

  assert.equal(findPhantomDepartmentHeadWarnings(departments, employees).length, 0);
});
