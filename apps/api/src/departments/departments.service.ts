import { randomBytes } from 'node:crypto';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Department } from './department.entity.ts';
import type { CreateDepartmentDto } from './dto/create-department.dto.ts';
import type { UpdateDepartmentDto } from './dto/update-department.dto.ts';

/** `master-data-management` capability: CRUD + non-destructive deactivation for departments, with parent-cycle prevention. */
@Injectable()
export class DepartmentsService {
  constructor(@InjectRepository(Department) private readonly departmentRepo: Repository<Department>) {}

  findAll(): Promise<Department[]> {
    return this.departmentRepo.find({ order: { name: 'ASC' } });
  }

  async findOne(id: string): Promise<Department> {
    const department = await this.departmentRepo.findOne({ where: { id } });
    if (!department) {
      throw new NotFoundException(`Department ${id} not found`);
    }
    return department;
  }

  async create(dto: CreateDepartmentDto): Promise<Department> {
    const parentName = dto.parentName ?? '';
    if (parentName) {
      await this.assertParentExists(parentName);
      await this.assertNoCycle(dto.name, parentName);
    }

    const department = this.departmentRepo.create({
      id: dto.id ?? randomBytes(4).toString('hex'),
      name: dto.name,
      parentName,
      head: dto.head ?? '',
      sysId: randomBytes(16).toString('hex'),
      active: true,
    });
    return this.departmentRepo.save(department);
  }

  async update(id: string, dto: UpdateDepartmentDto): Promise<Department> {
    const department = await this.findOne(id);
    const name = dto.name ?? department.name;

    if (dto.parentName !== undefined && dto.parentName !== '') {
      await this.assertParentExists(dto.parentName);
      await this.assertNoCycle(name, dto.parentName);
    }

    Object.assign(department, dto);
    return this.departmentRepo.save(department);
  }

  async deactivate(id: string): Promise<Department> {
    const department = await this.findOne(id);
    department.active = false;
    return this.departmentRepo.save(department);
  }

  private async assertParentExists(parentName: string): Promise<void> {
    const parent = await this.departmentRepo.findOne({ where: { name: parentName } });
    if (!parent) {
      throw new BadRequestException(`Department "${parentName}" does not exist`);
    }
  }

  /** Walks the proposed parent's ancestor chain (by name) to ensure `departmentName` doesn't appear in it. */
  private async assertNoCycle(departmentName: string, parentName: string): Promise<void> {
    if (parentName === departmentName) {
      throw new BadRequestException(`Department "${departmentName}" cannot be its own parent`);
    }

    const visited = new Set<string>();
    let current: string = parentName;
    while (current) {
      if (current === departmentName) {
        throw new BadRequestException(`Setting parent to "${parentName}" would create a cycle`);
      }
      if (visited.has(current)) {
        break;
      }
      visited.add(current);

      const ancestor = await this.departmentRepo.findOne({ where: { name: current } });
      if (!ancestor) {
        break;
      }
      current = ancestor.parentName;
    }
  }
}
