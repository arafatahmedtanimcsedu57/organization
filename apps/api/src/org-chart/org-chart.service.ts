import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  buildDepartmentTree,
  placeAssignments,
  placeEmployees,
  type Assignment as AssignmentRow,
  type Department as DepartmentRow,
  type Employee as EmployeeRow,
  type OrgModel,
} from '@org-chart/domain';
import { Department } from '../departments/department.entity.ts';
import { Employee } from '../employees/employee.entity.ts';
import { Assignment } from '../assignments/assignment.entity.ts';

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
  ) {}

  async buildOrgModel(): Promise<OrgModel> {
    const [departments, employees, assignments] = await Promise.all([
      this.departmentRepo.find({ where: { active: true } }),
      this.employeeRepo.find({ where: { active: true } }),
      this.assignmentRepo.find(),
    ]);

    const departmentNameById = new Map(departments.map((d) => [d.id, d.name]));

    const departmentRows: DepartmentRow[] = departments.map((d) => ({
      id: d.id,
      name: d.name,
      parentName: d.parentName,
      head: d.head,
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
          departmentName,
        },
      ];
    });

    const assignmentRows: AssignmentRow[] = assignments.map((a) => ({
      employeeSysId: a.employeeSysId,
      departmentId: a.departmentId,
      title: a.title,
      type: a.assignmentType,
    }));

    const tree = buildDepartmentTree(departmentRows);
    const memberWarnings = placeEmployees(tree, employeeRows);
    const assignmentWarnings = placeAssignments(tree, employeeRows, assignmentRows);

    return {
      roots: tree.roots,
      warnings: [...tree.warnings, ...memberWarnings, ...assignmentWarnings],
      stats: {
        departments: departmentRows.length,
        peoplePlaced: employeeRows.length,
        concurrentEntries: assignmentRows.filter((a) => a.type === 'concurrent').length,
      },
    };
  }
}
