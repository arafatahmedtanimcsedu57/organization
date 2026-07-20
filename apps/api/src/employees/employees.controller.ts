import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { EmployeesService } from './employees.service.ts';
import { Employee } from './employee.entity.ts';
import { CreateEmployeeDto } from './dto/create-employee.dto.ts';
import { UpdateEmployeeDto } from './dto/update-employee.dto.ts';

/** `master-data-management` capability: employee CRUD + deactivation, consumed by the admin UI. */
@Controller('employees')
export class EmployeesController {
  constructor(private readonly employeesService: EmployeesService) {}

  @Get()
  findAll(): Promise<Employee[]> {
    return this.employeesService.findAll();
  }

  @Get(':sysId')
  findOne(@Param('sysId') sysId: string): Promise<Employee> {
    return this.employeesService.findOne(sysId);
  }

  @Post()
  create(@Body() dto: CreateEmployeeDto): Promise<Employee> {
    return this.employeesService.create(dto);
  }

  @Patch(':sysId')
  update(@Param('sysId') sysId: string, @Body() dto: UpdateEmployeeDto): Promise<Employee> {
    return this.employeesService.update(sysId, dto);
  }

  @Patch(':sysId/deactivate')
  deactivate(@Param('sysId') sysId: string): Promise<Employee> {
    return this.employeesService.deactivate(sysId);
  }
}
