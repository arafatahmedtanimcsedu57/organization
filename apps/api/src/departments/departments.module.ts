import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Department } from './department.entity.ts';

/** Exposes the `Department` repository to other feature modules via DI. */
@Module({
  imports: [TypeOrmModule.forFeature([Department])],
  exports: [TypeOrmModule],
})
export class DepartmentsModule {}
