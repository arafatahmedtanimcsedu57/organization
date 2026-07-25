import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Employee } from './employee.entity.ts';
import { Department } from '../departments/department.entity.ts';
import { DepartmentTitle } from '../departments/department-title.entity.ts';
import { Title } from '../titles/title.entity.ts';
import { EmployeesService } from './employees.service.ts';
import { EmployeesController } from './employees.controller.ts';

/** `master-data-management` capability: employee CRUD, and exposes the `Employee` repository to other feature modules via DI. */
@Module({
  imports: [TypeOrmModule.forFeature([Employee, Department, Title, DepartmentTitle])],
  controllers: [EmployeesController],
  providers: [EmployeesService],
  exports: [TypeOrmModule],
})
export class EmployeesModule {}
