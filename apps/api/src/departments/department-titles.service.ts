import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { DepartmentTitle } from './department-title.entity.ts';
import { Title } from '../titles/title.entity.ts';
import { Employee } from '../employees/employee.entity.ts';
import { Assignment } from '../assignments/assignment.entity.ts';

/**
 * Manages which titles are usable within a department (the `department_titles` link).
 * This is the constraint the employee/assignment services enforce when a title is set.
 */
@Injectable()
export class DepartmentTitlesService {
  constructor(
    @InjectRepository(DepartmentTitle) private readonly deptTitleRepo: Repository<DepartmentTitle>,
    @InjectRepository(Title) private readonly titleRepo: Repository<Title>,
    @InjectRepository(Employee) private readonly employeeRepo: Repository<Employee>,
    @InjectRepository(Assignment) private readonly assignmentRepo: Repository<Assignment>,
  ) {}

  /** Active titles assigned to the department, rank-ordered - feeds the title pickers. */
  async listTitles(departmentId: string): Promise<Title[]> {
    const links = await this.deptTitleRepo.find({ where: { departmentId } });
    if (links.length === 0) return [];
    const titles = await this.titleRepo.find({ where: { id: In(links.map((l) => l.titleId)) } });
    return titles.filter((t) => t.active).sort((a, b) => a.rank - b.rank);
  }

  async assign(departmentId: string, titleId: string): Promise<DepartmentTitle> {
    const title = await this.titleRepo.findOne({ where: { id: titleId } });
    if (!title) {
      throw new BadRequestException(`Title "${titleId}" does not exist`);
    }
    // Composite PK makes this idempotent - re-assigning is a harmless no-op save.
    return this.deptTitleRepo.save(this.deptTitleRepo.create({ departmentId, titleId }));
  }

  /** Unassign, unless an active employee or a posting in this department still uses the title. */
  async unassign(departmentId: string, titleId: string): Promise<void> {
    const employeeInUse = await this.employeeRepo.findOne({
      where: { departmentId, titleId, active: true },
    });
    const postingInUse = await this.assignmentRepo.findOne({ where: { departmentId, titleId } });
    if (employeeInUse || postingInUse) {
      throw new ConflictException(
        `Title "${titleId}" is still in use in department ${departmentId}; reassign those people first`,
      );
    }
    await this.deptTitleRepo.delete({ departmentId, titleId });
  }
}
