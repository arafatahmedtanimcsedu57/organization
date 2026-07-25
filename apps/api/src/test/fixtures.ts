import { randomUUID } from 'node:crypto';
import { CANONICAL_TITLES } from '@org-chart/domain';
import type { Department } from '../departments/department.entity.ts';
import type { DepartmentTitle } from '../departments/department-title.entity.ts';
import type { Employee } from '../employees/employee.entity.ts';
import type { Assignment } from '../assignments/assignment.entity.ts';
import type { Title } from '../titles/title.entity.ts';

/**
 * Deterministic dataset the ephemeral test database is reset to before every
 * feature test run: a 3-department tree, a shared-last-name pair (disambiguation),
 * a staff-level roster entry, one concurrent (兼務) posting mirroring the legacy
 * chart's `(兼)佐藤(悠)`, and the managed titles those postings reference. IDs are
 * fixed strings, never generated, so assertions can hardcode them.
 */
export const fixtureTitles: Pick<Title, 'id' | 'name' | 'nameEn' | 'rank' | 'staffLevel' | 'active'>[] =
  CANONICAL_TITLES.map((t) => ({
    id: t.id,
    name: t.name,
    nameEn: t.nameEn,
    rank: t.rank,
    staffLevel: t.staffLevel,
    active: t.active,
  }));

export const fixtureDepartments: Pick<Department, 'id' | 'name' | 'parentName' | 'head' | 'sysId' | 'active'>[] = [
  { id: 'dept-1', name: '営業本部', parentName: '', head: '佐藤悠', sysId: 'dept-1-sys', active: true },
  { id: 'dept-2', name: 'ソリューション営業部', parentName: '営業本部', head: '', sysId: 'dept-2-sys', active: true },
  { id: 'dept-3', name: 'システム事業部', parentName: '', head: '', sysId: 'dept-3-sys', active: true },
];

/** Which titles each department may use - the titles its fixture postings reference. */
export const fixtureDepartmentTitles: Pick<DepartmentTitle, 'departmentId' | 'titleId'>[] = [
  { departmentId: 'dept-1', titleId: 'division-manager' },
  { departmentId: 'dept-2', titleId: 'general-manager' }, // 佐藤悠's concurrent 部長 posting
  { departmentId: 'dept-2', titleId: 'manager' },
  { departmentId: 'dept-2', titleId: 'deputy-manager' },
  { departmentId: 'dept-2', titleId: 'employee' },
];

export const fixtureEmployees: Pick<
  Employee,
  'sysId' | 'userId' | 'lastName' | 'firstName' | 'title' | 'titleId' | 'departmentId' | 'active'
>[] = [
  { sysId: 'emp-s1', userId: 'u1', lastName: '佐藤', firstName: '悠', title: '本部長', titleId: 'division-manager', departmentId: 'dept-1', active: true },
  { sysId: 'emp-s2', userId: 'u2', lastName: '佐藤', firstName: '晃', title: '課長', titleId: 'manager', departmentId: 'dept-2', active: true },
  {
    sysId: 'emp-s3',
    userId: 'u3',
    lastName: '高橋',
    firstName: '一郎',
    title: '担当課長',
    titleId: 'deputy-manager',
    departmentId: 'dept-2',
    active: true,
  },
  { sysId: 'emp-s4', userId: 'u4', lastName: '鈴木', firstName: '太郎', title: '課員', titleId: 'employee', departmentId: 'dept-2', active: true },
];

/** `randomUUID()` at load time, not a DB-side default, so seeding never depends on a Postgres uuid extension. */
export const fixtureAssignments: Pick<
  Assignment,
  'id' | 'employeeSysId' | 'departmentId' | 'title' | 'titleId' | 'isPrimary' | 'assignmentType' | 'validFrom' | 'validTo'
>[] = [
  {
    id: randomUUID(),
    employeeSysId: 'emp-s1',
    departmentId: 'dept-2',
    title: '部長',
    titleId: 'general-manager',
    isPrimary: false,
    assignmentType: 'concurrent',
    validFrom: null,
    validTo: null,
  },
];
