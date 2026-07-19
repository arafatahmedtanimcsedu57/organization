import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Employee } from './employee.entity.ts';

/** Exposes the `Employee` repository to other feature modules via DI. */
@Module({
  imports: [TypeOrmModule.forFeature([Employee])],
  exports: [TypeOrmModule],
})
export class EmployeesModule {}
