import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Assignment } from './assignment.entity.ts';
import { Department } from '../departments/department.entity.ts';
import { Employee } from '../employees/employee.entity.ts';
import type { CreateAssignmentDto } from './dto/create-assignment.dto.ts';
import type { UpdateAssignmentDto } from './dto/update-assignment.dto.ts';

/** `concurrent-duties` capability: CRUD for primary/concurrent (兼務) postings. */
@Injectable()
export class AssignmentsService {
  constructor(
    @InjectRepository(Assignment) private readonly assignmentRepo: Repository<Assignment>,
    @InjectRepository(Employee) private readonly employeeRepo: Repository<Employee>,
    @InjectRepository(Department) private readonly departmentRepo: Repository<Department>,
  ) {}

  findAll(): Promise<Assignment[]> {
    return this.assignmentRepo.find({ order: { employeeSysId: 'ASC' } });
  }

  async findOne(id: string): Promise<Assignment> {
    const assignment = await this.assignmentRepo.findOne({ where: { id } });
    if (!assignment) {
      throw new NotFoundException(`Assignment ${id} not found`);
    }
    return assignment;
  }

  async create(dto: CreateAssignmentDto): Promise<Assignment> {
    await this.assertEmployeeExists(dto.employeeSysId);
    await this.assertDepartmentExists(dto.departmentId);

    const assignment = this.assignmentRepo.create({
      employeeSysId: dto.employeeSysId,
      departmentId: dto.departmentId,
      title: dto.title,
      assignmentType: dto.assignmentType,
      isPrimary: dto.isPrimary ?? false,
      validFrom: dto.validFrom ?? null,
      validTo: dto.validTo ?? null,
    });
    return this.assignmentRepo.save(assignment);
  }

  async update(id: string, dto: UpdateAssignmentDto): Promise<Assignment> {
    const assignment = await this.findOne(id);
    Object.assign(assignment, dto);
    return this.assignmentRepo.save(assignment);
  }

  async remove(id: string): Promise<void> {
    const assignment = await this.findOne(id);
    await this.assignmentRepo.remove(assignment);
  }

  private async assertEmployeeExists(sysId: string): Promise<void> {
    const employee = await this.employeeRepo.findOne({ where: { sysId } });
    if (!employee) {
      throw new BadRequestException(`Employee ${sysId} does not exist`);
    }
  }

  private async assertDepartmentExists(departmentId: string): Promise<void> {
    const department = await this.departmentRepo.findOne({ where: { id: departmentId } });
    if (!department) {
      throw new BadRequestException(`Department ${departmentId} does not exist`);
    }
  }
}
