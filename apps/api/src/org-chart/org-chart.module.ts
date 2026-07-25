import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Department } from '../departments/department.entity.ts';
import { Employee } from '../employees/employee.entity.ts';
import { Assignment } from '../assignments/assignment.entity.ts';
import { Title } from '../titles/title.entity.ts';
import { OrgChartService } from './org-chart.service.ts';
import { ChartPdfService } from './chart-pdf.service.ts';
import { OrgChartController } from './org-chart.controller.ts';

/** `org-chart` capability: builds the department tree + rosters for the API/PDF. */
@Module({
  imports: [TypeOrmModule.forFeature([Department, Employee, Assignment, Title])],
  controllers: [OrgChartController],
  providers: [OrgChartService, ChartPdfService],
  exports: [OrgChartService],
})
export class OrgChartModule {}
