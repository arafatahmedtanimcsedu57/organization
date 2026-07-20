import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Assignment } from './assignment.entity.ts';
import { Department } from '../departments/department.entity.ts';
import { Employee } from '../employees/employee.entity.ts';
import { AssignmentsService } from './assignments.service.ts';
import { AssignmentsController } from './assignments.controller.ts';

/** `concurrent-duties` capability: assignment CRUD, and exposes the `Assignment` repository to other feature modules via DI. */
@Module({
  imports: [TypeOrmModule.forFeature([Assignment, Employee, Department])],
  controllers: [AssignmentsController],
  providers: [AssignmentsService],
  exports: [TypeOrmModule],
})
export class AssignmentsModule {}
