import { randomBytes } from 'node:crypto';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Employee } from './employee.entity.ts';
import { Department } from '../departments/department.entity.ts';
import { DepartmentTitle } from '../departments/department-title.entity.ts';
import { Title } from '../titles/title.entity.ts';
import type { CreateEmployeeDto } from './dto/create-employee.dto.ts';
import type { UpdateEmployeeDto } from './dto/update-employee.dto.ts';

/** `master-data-management` capability: CRUD + non-destructive deactivation for employees. */
@Injectable()
export class EmployeesService {
  constructor(
    @InjectRepository(Employee) private readonly employeeRepo: Repository<Employee>,
    @InjectRepository(Department) private readonly departmentRepo: Repository<Department>,
    @InjectRepository(Title) private readonly titleRepo: Repository<Title>,
    @InjectRepository(DepartmentTitle) private readonly departmentTitleRepo: Repository<DepartmentTitle>,
  ) {}

  findAll(): Promise<Employee[]> {
    return this.employeeRepo.find({ order: { lastName: 'ASC', firstName: 'ASC' } });
  }

  async findOne(sysId: string): Promise<Employee> {
    const employee = await this.employeeRepo.findOne({ where: { sysId } });
    if (!employee) {
      throw new NotFoundException(`Employee ${sysId} not found`);
    }
    return employee;
  }

  async create(dto: CreateEmployeeDto): Promise<Employee> {
    await this.assertDepartmentExists(dto.departmentId);
    const title = await this.resolveDepartmentTitle(dto.titleId, dto.departmentId);

    const employee = this.employeeRepo.create({
      sysId: randomBytes(16).toString('hex'),
      userId: dto.userId ?? (await this.nextUserId()),
      lastName: dto.lastName,
      firstName: dto.firstName,
      title: title.name,
      titleId: title.id,
      departmentId: dto.departmentId,
      active: true,
    });
    return this.employeeRepo.save(employee);
  }

  async update(sysId: string, dto: UpdateEmployeeDto): Promise<Employee> {
    const employee = await this.findOne(sysId);
    if (dto.departmentId) {
      await this.assertDepartmentExists(dto.departmentId);
    }

    if (dto.lastName !== undefined) employee.lastName = dto.lastName;
    if (dto.firstName !== undefined) employee.firstName = dto.firstName;
    if (dto.departmentId !== undefined) employee.departmentId = dto.departmentId;

    // Re-validate the title against the (possibly new) department whenever either changes.
    if (dto.titleId !== undefined || dto.departmentId !== undefined) {
      const titleId = dto.titleId ?? employee.titleId;
      if (titleId) {
        const title = await this.resolveDepartmentTitle(titleId, employee.departmentId);
        employee.titleId = title.id;
        employee.title = title.name;
      }
    }
    return this.employeeRepo.save(employee);
  }

  async deactivate(sysId: string): Promise<Employee> {
    const employee = await this.findOne(sysId);
    employee.active = false;
    return this.employeeRepo.save(employee);
  }

  private async assertDepartmentExists(departmentId: string): Promise<void> {
    const department = await this.departmentRepo.findOne({ where: { id: departmentId } });
    if (!department) {
      throw new BadRequestException(`Department ${departmentId} does not exist`);
    }
  }

  /**
   * Resolves a title id to an active `Title` that is assigned to the department,
   * enforcing "a person's title must be pre-defined and assigned to their department".
   */
  private async resolveDepartmentTitle(titleId: string, departmentId: string): Promise<Title> {
    const title = await this.titleRepo.findOne({ where: { id: titleId } });
    if (!title || !title.active) {
      throw new BadRequestException(`Title "${titleId}" does not exist or is inactive`);
    }
    const link = await this.departmentTitleRepo.findOne({ where: { departmentId, titleId } });
    if (!link) {
      throw new BadRequestException(`Title "${title.name}" is not assigned to department ${departmentId}`);
    }
    return title;
  }

  /** Best-effort sequential `User ID` (mirrors the zero-padded `sys_user` style) for records added outside the import. */
  private async nextUserId(): Promise<string> {
    const [lastByUserId] = await this.employeeRepo.find({ order: { userId: 'DESC' }, take: 1 });
    const lastNumeric = lastByUserId ? Number.parseInt(lastByUserId.userId, 10) : Number.NaN;
    if (Number.isNaN(lastNumeric)) {
      return randomBytes(3).toString('hex');
    }
    return String(lastNumeric + 1).padStart(4, '0');
  }
}
