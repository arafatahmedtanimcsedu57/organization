import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Department } from './department.entity.ts';
import { DepartmentsService } from './departments.service.ts';
import { DepartmentsController } from './departments.controller.ts';

/** `master-data-management` capability: department CRUD, and exposes the `Department` repository to other feature modules via DI. */
@Module({
  imports: [TypeOrmModule.forFeature([Department])],
  controllers: [DepartmentsController],
  providers: [DepartmentsService],
  exports: [TypeOrmModule],
})
export class DepartmentsModule {}
