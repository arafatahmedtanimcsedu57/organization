import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Department } from './department.entity.ts';
import { DepartmentTitle } from './department-title.entity.ts';
import { Title } from '../titles/title.entity.ts';
import { Employee } from '../employees/employee.entity.ts';
import { Assignment } from '../assignments/assignment.entity.ts';
import { DepartmentsService } from './departments.service.ts';
import { DepartmentsController } from './departments.controller.ts';
import { DepartmentTitlesService } from './department-titles.service.ts';
import { DepartmentTitlesController } from './department-titles.controller.ts';

/** `master-data-management` capability: department CRUD + the Department↔Title assignment. */
@Module({
  imports: [TypeOrmModule.forFeature([Department, DepartmentTitle, Title, Employee, Assignment])],
  controllers: [DepartmentsController, DepartmentTitlesController],
  providers: [DepartmentsService, DepartmentTitlesService],
  exports: [TypeOrmModule],
})
export class DepartmentsModule {}
