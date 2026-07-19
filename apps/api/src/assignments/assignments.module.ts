import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Assignment } from './assignment.entity.ts';

/** Exposes the `Assignment` (兼務) repository to other feature modules via DI. */
@Module({
  imports: [TypeOrmModule.forFeature([Assignment])],
  exports: [TypeOrmModule],
})
export class AssignmentsModule {}
