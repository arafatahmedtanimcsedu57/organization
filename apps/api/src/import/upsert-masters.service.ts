import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { Department as DepartmentRow, Employee as EmployeeRow } from '@org-chart/domain';
import { Department } from '../departments/department.entity.ts';
import { Employee } from '../employees/employee.entity.ts';
import { findUnmatchedDepartmentWarnings, type ImportWarning } from './import-warnings.ts';

export interface UpsertCounts {
  inserted: number;
  updated: number;
}

export interface EmployeeUpsertResult extends UpsertCounts {
  warnings: ImportWarning[];
}

/**
 * Writes the parsed masters into Postgres, keyed by the masters' own stable
 * identifiers (department `id`, employee `Sys ID`). `Repository.save` inserts
 * or updates based on whether that primary key already exists, so re-running
 * the import updates rows in place instead of duplicating them.
 */
@Injectable()
export class UpsertMastersService {
  constructor(
    @InjectRepository(Department) private readonly departmentRepo: Repository<Department>,
    @InjectRepository(Employee) private readonly employeeRepo: Repository<Employee>,
  ) {}

  async upsertDepartments(rows: DepartmentRow[]): Promise<UpsertCounts> {
    const existingIds = new Set((await this.departmentRepo.find({ select: ['id'] })).map((d) => d.id));
    await this.departmentRepo.save(
      rows.map((r) =>
        this.departmentRepo.create({
          id: r.id,
          name: r.name,
          parentName: r.parentName,
          head: r.head,
          sysId: r.sysId,
          active: true,
        }),
      ),
    );
    const inserted = rows.filter((r) => !existingIds.has(r.id)).length;
    return { inserted, updated: rows.length - inserted };
  }

  /**
   * `departmentIdByName` resolves each employee's `Department` (a name string
   * in the source master) to the department's `id`. Employees whose
   * department name has no match are skipped from the insert but still
   * reported via `warnings` (see `findUnmatchedDepartmentWarnings`).
   */
  async upsertEmployees(
    rows: EmployeeRow[],
    departmentIdByName: ReadonlyMap<string, string>,
  ): Promise<EmployeeUpsertResult> {
    const existingIds = new Set((await this.employeeRepo.find({ select: ['sysId'] })).map((e) => e.sysId));
    const resolved = rows.flatMap((r) => {
      const departmentId = departmentIdByName.get(r.departmentName);
      if (!departmentId) return [];
      return [
        this.employeeRepo.create({
          sysId: r.sysId,
          userId: r.userId,
          lastName: r.lastName,
          firstName: r.firstName,
          title: r.title,
          titleId: r.titleId || null,
          departmentId,
          active: true,
        }),
      ];
    });
    await this.employeeRepo.save(resolved);
    const inserted = resolved.filter((e) => !existingIds.has(e.sysId)).length;
    const warnings = findUnmatchedDepartmentWarnings(rows, departmentIdByName);
    return { inserted, updated: resolved.length - inserted, warnings };
  }

  /**
   * Resolves each department's free-text `head` name to an employee `Sys ID` and
   * persists it as `head_sys_id`, anchoring "who heads this department" to a
   * stable identifier instead of a hand-typed name. Runs *after* employees are
   * upserted (the FK requires them to exist). Names matching no employee are
   * left unresolved - they surface separately via `findPhantomDepartmentHeadWarnings`.
   */
  async backfillDepartmentHeads(
    departments: DepartmentRow[],
    employees: EmployeeRow[],
  ): Promise<{ resolved: number; unresolved: number }> {
    // Match on `firstName + lastName` with whitespace stripped - the same shape
    // `head` is stored in ("First Last"), mirroring findPhantomDepartmentHeadWarnings.
    const sysIdByName = new Map(employees.map((e) => [`${e.firstName}${e.lastName}`, e.sysId]));

    let resolved = 0;
    let unresolved = 0;
    for (const d of departments) {
      if (!d.head) continue;
      const headSysId = sysIdByName.get(d.head.replace(/\s+/g, ''));
      if (headSysId) {
        await this.departmentRepo.update(d.id, { headSysId });
        resolved++;
      } else {
        unresolved++;
      }
    }
    return { resolved, unresolved };
  }
}
