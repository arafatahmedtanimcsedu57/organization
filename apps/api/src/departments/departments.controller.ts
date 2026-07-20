import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { DepartmentsService } from './departments.service.ts';
import { Department } from './department.entity.ts';
import { CreateDepartmentDto } from './dto/create-department.dto.ts';
import { UpdateDepartmentDto } from './dto/update-department.dto.ts';

/** `master-data-management` capability: department CRUD + deactivation, consumed by the admin UI. */
@Controller('departments')
export class DepartmentsController {
  constructor(private readonly departmentsService: DepartmentsService) {}

  @Get()
  findAll(): Promise<Department[]> {
    return this.departmentsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string): Promise<Department> {
    return this.departmentsService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateDepartmentDto): Promise<Department> {
    return this.departmentsService.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateDepartmentDto): Promise<Department> {
    return this.departmentsService.update(id, dto);
  }

  @Patch(':id/deactivate')
  deactivate(@Param('id') id: string): Promise<Department> {
    return this.departmentsService.deactivate(id);
  }
}
