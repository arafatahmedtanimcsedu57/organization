import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  buildDepartmentTree,
  placeAssignments,
  placeEmployees,
  resolveDepartmentHeads,
  type Assignment as AssignmentRow,
  type Department as DepartmentRow,
  type Employee as EmployeeRow,
  type OrgModel,
  type Title as TitleRow,
} from '@org-chart/domain';
import type { AppConfig } from '../config/configuration.ts';
import { Department } from '../departments/department.entity.ts';
import { Employee } from '../employees/employee.entity.ts';
import { Assignment } from '../assignments/assignment.entity.ts';
import { Title } from '../titles/title.entity.ts';

/**
 * `org-chart` capability: loads active departments/employees/assignments from
 * Postgres and delegates tree-building, rank ordering, disambiguation, and
 * 兼務 placement to the framework-free `@org-chart/domain` package.
 */
@Injectable()
export class OrgChartService {
  constructor(
    @InjectRepository(Department) private readonly departmentRepo: Repository<Department>,
    @InjectRepository(Employee) private readonly employeeRepo: Repository<Employee>,
    @InjectRepository(Assignment) private readonly assignmentRepo: Repository<Assignment>,
    @InjectRepository(Title) private readonly titleRepo: Repository<Title>,
    private readonly config: ConfigService<AppConfig, true>,
  ) {}

  async buildOrgModel(): Promise<OrgModel> {
    const [departments, employees, assignments, titles] = await Promise.all([
      this.departmentRepo.find({ where: { active: true } }),
      this.employeeRepo.find({ where: { active: true } }),
      this.assignmentRepo.find(),
      // All titles (incl. deactivated) so existing postings still resolve their rank.
      this.titleRepo.find(),
    ]);

    const departmentNameById = new Map(departments.map((d) => [d.id, d.name]));

    const departmentRows: DepartmentRow[] = departments.map((d) => ({
      id: d.id,
      name: d.name,
      parentName: d.parentName,
      head: d.head,
      headSysId: d.headSysId ?? undefined,
      sysId: d.sysId,
    }));

    // `Employee.departmentId` is the FK; the domain package joins by name (matching
    // the source master's `sys_user.Department` string), so resolve it here.
    const employeeRows: EmployeeRow[] = employees.flatMap((e) => {
      const departmentName = departmentNameById.get(e.departmentId);
      if (!departmentName) return [];
      return [
        {
          sysId: e.sysId,
          userId: e.userId,
          lastName: e.lastName,
          firstName: e.firstName,
          title: e.title,
          titleId: e.titleId ?? '',
          departmentName,
        },
      ];
    });

    const assignmentRows: AssignmentRow[] = assignments.map((a) => ({
      employeeSysId: a.employeeSysId,
      departmentId: a.departmentId,
      title: a.title,
      titleId: a.titleId ?? '',
      type: a.assignmentType,
    }));

    const titleRows: TitleRow[] = titles.map((t) => ({
      id: t.id,
      name: t.name,
      nameEn: t.nameEn,
      rank: t.rank,
      staffLevel: t.staffLevel,
      active: t.active,
    }));

    // The DB holds strings in whichever language was seeded; `lang` steers the
    // display label (JA vs EN) and the display-name overrides.
    const lang = this.config.get('import.lang', { infer: true });
    const tree = buildDepartmentTree(departmentRows);
    const memberWarnings = placeEmployees(tree, employeeRows, titleRows, lang);
    const assignmentWarnings = placeAssignments(tree, employeeRows, assignmentRows, titleRows, lang);
    // After rosters are placed/ranked, resolve each head from its Sys ID
    // (falling back to the top-ranked member) - see resolveDepartmentHeads.
    const headWarnings = resolveDepartmentHeads(tree, employeeRows);

    return {
      roots: tree.roots,
      warnings: [...tree.warnings, ...memberWarnings, ...assignmentWarnings, ...headWarnings],
      stats: {
        departments: departmentRows.length,
        peoplePlaced: employeeRows.length,
        concurrentEntries: assignmentRows.filter((a) => a.type === 'concurrent').length,
      },
    };
  }
}
