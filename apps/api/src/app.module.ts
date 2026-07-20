import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import configuration from './config/configuration.ts';
import type { AppConfig } from './config/configuration.ts';
import { AppController } from './app.controller.ts';
import { AppService } from './app.service.ts';
import { Department } from './departments/department.entity.ts';
import { Employee } from './employees/employee.entity.ts';
import { Assignment } from './assignments/assignment.entity.ts';
import { ChangeLog } from './history/change-log.entity.ts';
import { DepartmentsModule } from './departments/departments.module.ts';
import { EmployeesModule } from './employees/employees.module.ts';
import { AssignmentsModule } from './assignments/assignments.module.ts';
import { HistoryModule } from './history/history.module.ts';
import { OrgChartModule } from './org-chart/org-chart.module.ts';
import { AuditModule } from './common/audit.module.ts';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService<AppConfig, true>) => ({
        type: 'postgres' as const,
        url: configService.get('database.url', { infer: true }),
        entities: [Department, Employee, Assignment, ChangeLog],
        synchronize: false,
      }),
    }),
    DepartmentsModule,
    EmployeesModule,
    AssignmentsModule,
    HistoryModule,
    OrgChartModule,
    AuditModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
